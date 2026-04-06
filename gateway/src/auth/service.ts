import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { redisDel, redisGet, redisSet } from './redis_store.js';

export interface AuthUser {
  id: string;
  email: string;
  githubTokens?: GitHubTokenEntry[];
  activeGithubTokenId?: string | null;
  profileImageUrl?: string | null;
  authProviders?: string[];
  createdAt: string;
}

export interface GitHubTokenEntry {
  id: string;
  label: string;
  token: string;
  createdAt: string;
}

interface StoredUser extends AuthUser {
  passwordHash: string;
}

interface StoredSession {
  userId: string;
  expiresAt: string;
}

const JWT_SECRET = process.env.JWT_SECRET || '';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_GITHUB_TOKENS = 3;

const userKeyByEmail = (email: string) => `auth:user:email:${email.toLowerCase()}`;
const userKeyById = (id: string) => `auth:user:id:${id}`;
const sessionKey = (tokenHash: string) => `auth:session:${tokenHash}`;

function ensureJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return JWT_SECRET;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function stripUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    githubTokens: user.githubTokens,
    activeGithubTokenId: user.activeGithubTokenId ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    authProviders: user.authProviders ?? [],
    createdAt: user.createdAt,
  };
}

async function createSessionToken(userId: string): Promise<string> {
  const secret = ensureJwtSecret();
  const token = jwt.sign(
    { sub: userId },
    secret,
    { expiresIn: TOKEN_TTL_SECONDS }
  );

  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  const session: StoredSession = { userId, expiresAt };
  await redisSet(sessionKey(tokenHash), JSON.stringify(session), TOKEN_TTL_SECONDS);

  return token;
}

async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const raw = await redisGet(userKeyByEmail(email));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as StoredUser;
}

async function getUserById(userId: string): Promise<StoredUser | null> {
  const raw = await redisGet(userKeyById(userId));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as StoredUser;
}

async function storeUser(user: StoredUser): Promise<void> {
  const payload = JSON.stringify(user);
  await redisSet(userKeyByEmail(user.email), payload);
  await redisSet(userKeyById(user.id), payload);
}

export async function registerUser(email: string, password: string): Promise<AuthUser> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: now,
    githubTokens: [],
    activeGithubTokenId: null,
    profileImageUrl: null,
    authProviders: ['email'],
  };

  await storeUser(user);
  return stripUser(user);
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  let userToReturn = user;
  const providers = user.authProviders ?? [];
  if (!providers.includes('email')) {
    const updated: StoredUser = {
      ...user,
      authProviders: [...providers, 'email'],
    };
    await storeUser(updated);
    userToReturn = updated;
  }

  const token = await createSessionToken(user.id);

  return { token, user: stripUser(userToReturn) };
}

export async function issueTokenForUserId(userId: string): Promise<string> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return createSessionToken(user.id);
}

export async function getOrCreateOAuthUser(
  email: string,
  provider: string
): Promise<AuthUser> {
  const existing = await getUserByEmail(email);
  if (existing) {
    const providers = existing.authProviders ?? [];
    if (!providers.includes(provider)) {
      const updated: StoredUser = {
        ...existing,
        authProviders: [...providers, provider],
      };
      await storeUser(updated);
      return stripUser(updated);
    }
    return stripUser(existing);
  }

  const passwordSeed = crypto.randomBytes(24).toString('hex');
  const passwordHash = await bcrypt.hash(passwordSeed, 12);
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: now,
    githubTokens: [],
    activeGithubTokenId: null,
    profileImageUrl: null,
    authProviders: [provider],
  };

  await storeUser(user);
  return stripUser(user);
}

export async function updateProfile(
  userId: string,
  profileImageUrl: string | null
): Promise<AuthUser> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const updated: StoredUser = {
    ...user,
    profileImageUrl,
  };

  await storeUser(updated);
  return stripUser(updated);
}

export function getGithubTokenMetadata(user: AuthUser) {
  const tokens = user.githubTokens ?? [];
  return tokens.map((entry) => ({
    id: entry.id,
    label: entry.label,
    lastFour: entry.token.slice(-4),
    createdAt: entry.createdAt,
  }));
}

export async function logoutToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await redisDel(sessionKey(tokenHash));
}

export async function addGithubToken(
  userId: string,
  token: string,
  label: string
): Promise<AuthUser> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const existing = user.githubTokens ?? [];
  if (existing.length >= MAX_GITHUB_TOKENS) {
    throw new Error('Maximum GitHub tokens reached');
  }

  const entry: GitHubTokenEntry = {
    id: crypto.randomUUID(),
    label,
    token,
    createdAt: new Date().toISOString(),
  };

  const updated: StoredUser = {
    ...user,
    githubTokens: [...existing, entry],
    activeGithubTokenId: user.activeGithubTokenId ?? entry.id,
  };

  await storeUser(updated);
  return stripUser(updated);
}

export async function updateGithubToken(
  userId: string,
  tokenId: string,
  token: string,
  label: string
): Promise<AuthUser> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedTokens = (user.githubTokens ?? []).map((entry) =>
    entry.id === tokenId
      ? { ...entry, token, label }
      : entry
  );

  if (!updatedTokens.find((entry) => entry.id === tokenId)) {
    throw new Error('GitHub token not found');
  }

  const updated: StoredUser = {
    ...user,
    githubTokens: updatedTokens,
  };

  await storeUser(updated);
  return stripUser(updated);
}

export async function deleteGithubToken(
  userId: string,
  tokenId: string
): Promise<AuthUser> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const filtered = (user.githubTokens ?? []).filter((entry) => entry.id !== tokenId);
  if (filtered.length === (user.githubTokens ?? []).length) {
    throw new Error('GitHub token not found');
  }

  const updated: StoredUser = {
    ...user,
    githubTokens: filtered,
    activeGithubTokenId:
      user.activeGithubTokenId && user.activeGithubTokenId !== tokenId
        ? user.activeGithubTokenId
        : filtered[0]?.id ?? null,
  };

  await storeUser(updated);
  return stripUser(updated);
}

export async function setActiveGithubToken(
  userId: string,
  tokenId: string
): Promise<AuthUser> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const exists = (user.githubTokens ?? []).some((entry) => entry.id === tokenId);
  if (!exists) {
    throw new Error('GitHub token not found');
  }

  const updated: StoredUser = {
    ...user,
    activeGithubTokenId: tokenId,
  };

  await storeUser(updated);
  return stripUser(updated);
}

export async function getGithubToken(userId: string): Promise<string | null> {
  const user = await getUserById(userId);
  if (user && user.githubTokens && user.githubTokens.length > 0) {
    const activeId = user.activeGithubTokenId ?? user.githubTokens[0].id;
    const active = user.githubTokens.find((entry) => entry.id === activeId);
    if (active?.token) {
        return active.token;
    }
  }

  // Fallback to environment variable if no user token is set
  return process.env.GITHUB_TOKEN ?? null;
}

export async function authenticateToken(token: string): Promise<AuthUser | null> {
  try {
    const secret = ensureJwtSecret();
    const payload = jwt.verify(token, secret) as { sub?: string };
    if (!payload.sub) {
      return null;
    }

    const tokenHash = hashToken(token);
    const sessionRaw = await redisGet(sessionKey(tokenHash));
    if (!sessionRaw) {
      return null;
    }

    const session = JSON.parse(sessionRaw) as StoredSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await redisDel(sessionKey(tokenHash));
      return null;
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return null;
    }

    return stripUser(user);
  } catch {
    return null;
  }
}
