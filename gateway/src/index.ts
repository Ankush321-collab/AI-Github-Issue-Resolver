import 'dotenv/config';

import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import axios from 'axios';

import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { authenticateToken, getOrCreateOAuthUser, issueTokenForUserId } from './auth/service.js';
import { consumeOAuthState, createOAuthState } from './auth/oauth.js';
import type { AuthContext } from './types/index.js';

const PORT = Number(process.env.PORT);
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const OAUTH_BASE_URL = process.env.OAUTH_BASE_URL as string;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

function getQueryValue(param: string | string[] | undefined): string | null {
  if (!param) {
    return null;
  }
  return Array.isArray(param) ? param[0] : param;
}

function loginRedirectUrl(token?: string, error?: string): string {
  const url = new URL('/login', FRONTEND_URL);
  if (token) {
    url.searchParams.set('token', token);
  }
  if (error) {
    url.searchParams.set('error', error);
  }
  return url.toString();
}

async function resolveGithubEmail(accessToken: string): Promise<string | null> {
  const response = await axios.get('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'agent-orchestrator-gateway',
      Accept: 'application/vnd.github+json',
    },
  });

  const emails = response.data as Array<{ email: string; primary?: boolean; verified?: boolean }>;
  const primary = emails.find((entry) => entry.primary && entry.verified);
  if (primary?.email) {
    return primary.email;
  }
  const fallback = emails.find((entry) => entry.verified);
  return fallback?.email ?? null;
}

async function resolveGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await axios.get('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = response.data as { email?: string };
  return payload.email ?? null;
}

async function startServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = http.createServer(app);

//  its working done manually

  const apolloServer = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    csrfPrevention: false,
  });

  await apolloServer.start();

  app.get('/auth/github', async (_req, res) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      res.status(500).send('GitHub OAuth is not configured');
      return;
    }

    const state = await createOAuthState('github');
    const redirectUri = `${OAUTH_BASE_URL}/auth/github/callback`;
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', 'read:user user:email');
    authorizeUrl.searchParams.set('state', state);

    res.redirect(authorizeUrl.toString());
  });

  app.get('/auth/github/callback', async (req, res) => {
    try {
      const code = getQueryValue(req.query.code as string | string[] | undefined);
      const state = getQueryValue(req.query.state as string | string[] | undefined);

      if (!code || !state) {
        res.redirect(loginRedirectUrl(undefined, 'Missing OAuth response'));
        return;
      }

      const validState = await consumeOAuthState(state, 'github');
      if (!validState) {
        res.redirect(loginRedirectUrl(undefined, 'Invalid OAuth state'));
        return;
      }

      const redirectUri = `${OAUTH_BASE_URL}/auth/github/callback`;
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        },
        { headers: { Accept: 'application/json' } }
      );

      const accessToken = tokenResponse.data?.access_token as string | undefined;
      if (!accessToken) {
        res.redirect(loginRedirectUrl(undefined, 'GitHub token exchange failed'));
        return;
      }

      const email = await resolveGithubEmail(accessToken);
      if (!email) {
        res.redirect(loginRedirectUrl(undefined, 'GitHub email not available'));
        return;
      }

      const user = await getOrCreateOAuthUser(email, 'github');
      const token = await issueTokenForUserId(user.id);

      res.redirect(loginRedirectUrl(token));
    } catch (error) {
      console.error('GitHub OAuth error', error);
      res.redirect(loginRedirectUrl(undefined, 'GitHub OAuth failed'));
    }
  });

  app.get('/auth/google', async (_req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.status(500).send('Google OAuth is not configured');
      return;
    }

    const state = await createOAuthState('google');
    const redirectUri = `${OAUTH_BASE_URL}/auth/google/callback`;
    const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizeUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid email profile');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('prompt', 'consent');

    res.redirect(authorizeUrl.toString());
  });

  app.get('/auth/google/callback', async (req, res) => {
    try {
      const code = getQueryValue(req.query.code as string | string[] | undefined);
      const state = getQueryValue(req.query.state as string | string[] | undefined);

      if (!code || !state) {
        res.redirect(loginRedirectUrl(undefined, 'Missing OAuth response'));
        return;
      }

      const validState = await consumeOAuthState(state, 'google');
      if (!validState) {
        res.redirect(loginRedirectUrl(undefined, 'Invalid OAuth state'));
        return;
      }

      const redirectUri = `${OAUTH_BASE_URL}/auth/google/callback`;
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const accessToken = tokenResponse.data?.access_token as string | undefined;
      if (!accessToken) {
        res.redirect(loginRedirectUrl(undefined, 'Google token exchange failed'));
        return;
      }

      const email = await resolveGoogleEmail(accessToken);
      if (!email) {
        res.redirect(loginRedirectUrl(undefined, 'Google email not available'));
        return;
      }

      const user = await getOrCreateOAuthUser(email, 'google');
      const token = await issueTokenForUserId(user.id);

      res.redirect(loginRedirectUrl(token));
    } catch (error) {
      console.error('Google OAuth error', error);
      res.redirect(loginRedirectUrl(undefined, 'Google OAuth failed'));
    }
  });

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length)
          : null;

        const user = token ? await authenticateToken(token) : null;

        const context: AuthContext = {
          user,
          token,
        };

        return context;
      },
    })
  );

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const authHeader =
          (ctx.connectionParams?.Authorization as string | undefined) ||
          (ctx.connectionParams?.authorization as string | undefined) ||
          '';
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice('Bearer '.length)
          : null;
        const user = token ? await authenticateToken(token) : null;

        const context: AuthContext = {
          user,
          token,
        };

        return context;
      },
    },
    wsServer
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 Gateway ready on port ${PORT}/graphql`);
    console.log(`🔌 WebSocket ready on port ${PORT}/graphql`);
  });
}

startServer().catch(console.error);
