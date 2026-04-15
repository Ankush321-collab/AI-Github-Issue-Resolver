import { PubSub } from 'graphql-subscriptions';

export const pubsub = new PubSub();

export const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL as string;
export const REDIS_HOST = process.env.REDIS_HOST as string;
export const REDIS_PORT = parseInt(process.env.REDIS_PORT as string, 10);

export interface AgentRun {
  id: string;
  issue: string;
  repoUrl: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error?: string;
  plan?: string;
  patch?: string;
  tests?: string;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentState {
  id: string;
  runId: string;
  stateJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLog {
  id: string;
  runId: string;
  agentName: string;
  message: string;
  timestamp: string;
}

export interface AgentProgress {
  runId: string;
  agentName: string;
  eventType: string;
  content: string;
  timestamp: string;
}

export interface StartRunResponse {
  id: string;
  issue: string;
  repoUrl: string;
  status: string;
  createdAt: string;
}

export interface AgentRunUpdate {
  runId: string;
  status: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  githubToken?: string;
  githubTokens?: GitHubToken[];
  activeGithubTokenId?: string | null;
  profileImageUrl?: string | null;
  authProviders?: string[];
  createdAt: string;
}

export interface GitHubToken {
  id: string;
  label: string;
  lastFour: string;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

export interface AuthContext {
  user: AuthUser | null;
  token: string | null;
}
