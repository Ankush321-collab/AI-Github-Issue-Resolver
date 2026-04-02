import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { authenticateToken } from './auth/service.js';
import type { AuthContext } from './types/index.js';

const PORT = Number(process.env.PORT || 4000);

async function startServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = http.createServer(app);

  const apolloServer = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    csrfPrevention: false,
  });

  await apolloServer.start();

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
    console.log(`🚀 Gateway ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);
