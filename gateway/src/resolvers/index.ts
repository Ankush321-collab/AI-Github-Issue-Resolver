import axios from 'axios';
import { createRedisClient, RedisClient } from './redis.js';
import { ORCHESTRATOR_URL, AgentRun, TaskLog, StartRunResponse, AuthContext } from '../types/index.js';
import { pubsub } from '../types/index.js';
import {
  registerUser,
  loginUser,
  logoutToken,
  addGithubToken,
  updateGithubToken,
  deleteGithubToken,
  setActiveGithubToken,
  getGithubToken,
  getGithubTokenMetadata,
} from '../auth/service.js';

let redisClient: RedisClient | null = null;

async function getRedisClient(): Promise<RedisClient> {
  if (!redisClient) {
    redisClient = createRedisClient(
      process.env.REDIS_HOST || 'redis',
      parseInt(process.env.REDIS_PORT || '6379')
    );
    await redisClient.connect();
  }
  return redisClient;
}

const activeSubscriptions = new Map<string, boolean>();

const normalizeRun = (run: Partial<AgentRun> & Record<string, unknown>): AgentRun => {
  const createdAt = (run.createdAt as string) ?? (run.created_at as string);
  return {
    ...(run as AgentRun),
    repoUrl: (run.repoUrl as string) ?? (run.repo_url as string),
    prUrl: (run.prUrl as string) ?? (run.pr_url as string),
    createdAt,
    updatedAt:
      (run.updatedAt as string) ??
      (run.updated_at as string) ??
      createdAt,
  };
};

const normalizeLog = (runId: string, log: Record<string, unknown>, index: number): TaskLog => ({
  id: (log.id as string) ?? `${runId}-${index}`,
  runId,
  agentName: (log.agentName as string) ?? (log.agent as string) ?? 'unknown',
  message: (log.message as string) ?? '',
  timestamp: (log.timestamp as string) ?? new Date().toISOString(),
});

const normalizeStartRun = (
  run: Partial<StartRunResponse> & Record<string, unknown>
): StartRunResponse => ({
  ...(run as StartRunResponse),
  repoUrl: (run.repoUrl as string) ?? (run.repo_url as string),
  createdAt: (run.createdAt as string) ?? (run.created_at as string),
});

const requireAuth = (context: AuthContext) => {
  if (!context.user) {
    throw new Error('Authentication required');
  }
};
export const resolvers = {
  Query: {
    getRuns: async (
      _: unknown,
      args: { limit?: number; offset?: number },
      context: AuthContext
    ): Promise<AgentRun[]> => {
      try {
        requireAuth(context);
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs`, {
          params: { limit: args.limit || 50, offset: args.offset || 0 },
        });
        return response.data.map(normalizeRun);
      } catch (error) {
        console.error('Error fetching runs:', error);
        return [];
      }
    },

    me: async (_: unknown, __: unknown, context: AuthContext) => {
      return context.user
        ? {
            id: context.user.id,
            email: context.user.email,
            hasGithubToken: Boolean(context.user.githubTokens?.length),
            githubTokens: getGithubTokenMetadata(context.user),
            activeGithubTokenId: context.user.activeGithubTokenId ?? null,
            createdAt: context.user.createdAt,
          }
        : null;
    },

    getRunDetails: async (
      _: unknown,
      args: { id: string },
      context: AuthContext
    ): Promise<AgentRun | null> => {
      try {
        requireAuth(context);
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${args.id}`);
        return normalizeRun(response.data);
      } catch (error) {
        console.error('Error fetching run details:', error);
        return null;
      }
    },

    getLogs: async (
      _: unknown,
      args: { runId: string },
      context: AuthContext
    ): Promise<TaskLog[]> => {
      try {
        requireAuth(context);
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/logs`);
        return (response.data || []).map((log: Record<string, unknown>, index: number) =>
          normalizeLog(args.runId, log, index)
        );
      } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
      }
    },
  },

  Mutation: {
    startRun: async (
      _: unknown,
      args: { issue: string; repoUrl: string },
      context: AuthContext
    ): Promise<StartRunResponse> => {
      try {
        requireAuth(context);
        const githubToken = await getGithubToken(context.user.id);
        if (!githubToken) {
          throw new Error('GitHub token not set');
        }

        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs`, {
          issue: args.issue,
          repo_url: args.repoUrl,
          github_token: githubToken,
        });

        const runId = response.data.id;
        startRedisSubscription(runId);

        return normalizeStartRun(response.data);
      } catch (error) {
        console.error('Error starting run:', error);
        throw new Error('Failed to start run');
      }
    },

    retryRun: async (
      _: unknown,
      args: { runId: string },
      context: AuthContext
    ): Promise<StartRunResponse> => {
      try {
        requireAuth(context);
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/retry`);
        startRedisSubscription(args.runId);
        return normalizeStartRun(response.data);
      } catch (error) {
        console.error('Error retrying run:', error);
        throw new Error('Failed to retry run');
      }
    },

    cancelRun: async (
      _: unknown,
      args: { runId: string },
      context: AuthContext
    ): Promise<StartRunResponse> => {
      try {
        requireAuth(context);
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/cancel`);
        return normalizeStartRun(response.data);
      } catch (error) {
        console.error('Error cancelling run:', error);
        throw new Error('Failed to cancel run');
      }
    },

    register: async (_: unknown, args: { email: string; password: string }) => {
      const user = await registerUser(args.email, args.password);
      const { token, user: authUser } = await loginUser(args.email, args.password);
      return {
        token,
        user: {
          id: authUser.id,
          email: authUser.email,
          hasGithubToken: Boolean(authUser.githubTokens?.length),
          githubTokens: getGithubTokenMetadata(authUser),
          activeGithubTokenId: authUser.activeGithubTokenId ?? null,
          createdAt: authUser.createdAt,
        },
      };
    },

    login: async (_: unknown, args: { email: string; password: string }) => {
      const { token, user } = await loginUser(args.email, args.password);
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          hasGithubToken: Boolean(user.githubTokens?.length),
          githubTokens: getGithubTokenMetadata(user),
          activeGithubTokenId: user.activeGithubTokenId ?? null,
          createdAt: user.createdAt,
        },
      };
    },

    logout: async (_: unknown, __: unknown, context: AuthContext) => {
      if (context.token) {
        await logoutToken(context.token);
      }
      return true;
    },

    addGithubToken: async (
      _: unknown,
      args: { token: string; label: string },
      context: AuthContext
    ) => {
      requireAuth(context);

      const user = await addGithubToken(context.user.id, args.token, args.label);
      return {
        id: user.id,
        email: user.email,
        hasGithubToken: Boolean(user.githubTokens?.length),
        githubTokens: getGithubTokenMetadata(user),
        activeGithubTokenId: user.activeGithubTokenId ?? null,
        createdAt: user.createdAt,
      };
    },

    updateGithubToken: async (
      _: unknown,
      args: { id: string; token: string; label: string },
      context: AuthContext
    ) => {
      requireAuth(context);

      const user = await updateGithubToken(context.user.id, args.id, args.token, args.label);
      return {
        id: user.id,
        email: user.email,
        hasGithubToken: Boolean(user.githubTokens?.length),
        githubTokens: getGithubTokenMetadata(user),
        activeGithubTokenId: user.activeGithubTokenId ?? null,
        createdAt: user.createdAt,
      };
    },

    deleteGithubToken: async (
      _: unknown,
      args: { id: string },
      context: AuthContext
    ) => {
      requireAuth(context);

      const user = await deleteGithubToken(context.user.id, args.id);
      return {
        id: user.id,
        email: user.email,
        hasGithubToken: Boolean(user.githubTokens?.length),
        githubTokens: getGithubTokenMetadata(user),
        activeGithubTokenId: user.activeGithubTokenId ?? null,
        createdAt: user.createdAt,
      };
    },

    setActiveGithubToken: async (
      _: unknown,
      args: { id: string },
      context: AuthContext
    ) => {
      requireAuth(context);

      const user = await setActiveGithubToken(context.user.id, args.id);
      return {
        id: user.id,
        email: user.email,
        hasGithubToken: Boolean(user.githubTokens?.length),
        githubTokens: getGithubTokenMetadata(user),
        activeGithubTokenId: user.activeGithubTokenId ?? null,
        createdAt: user.createdAt,
      };
    },
  },

  Subscription: {
    agentProgress: {
      subscribe: async function* (_: unknown, args: { runId: string }, context: AuthContext) {
        const runId = args.runId;
        
        try {
          requireAuth(context);
          const redis = await getRedisClient();
          const pubsub = redis.subscribeToUpdates(runId);
          
          yield { agentProgress: { runId, agentName: '', eventType: 'connected', content: 'Connected to progress stream', timestamp: new Date().toISOString() } };
          
          for await (const message of pubsub) {
            try {
              const data = JSON.parse(message);
              yield { agentProgress: { runId, ...data, timestamp: data.timestamp || new Date().toISOString() } };
            } catch (e) {
              console.error('Error parsing Redis message:', e);
            }
          }
        } catch (e) {
          console.error('Subscription error:', e);
        }
      },
    },
  },

  AgentRun: {
    repoUrl: (parent: AgentRun & Record<string, unknown>): string =>
      parent.repoUrl ?? (parent.repo_url as string),
    prUrl: (parent: AgentRun & Record<string, unknown>): string | undefined =>
      parent.prUrl ?? (parent.pr_url as string | undefined),
    createdAt: (parent: AgentRun & Record<string, unknown>): string =>
      parent.createdAt ?? (parent.created_at as string),
    updatedAt: (parent: AgentRun & Record<string, unknown>): string =>
      parent.updatedAt ?? (parent.updated_at as string) ?? parent.createdAt,
    state: async (parent: AgentRun): Promise<AgentRun['state']> => {
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${parent.id}/state`);
        return response.data;
      } catch {
        return null;
      }
    },
    taskLogs: async (parent: AgentRun): Promise<TaskLog[]> => {
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${parent.id}/logs`);
        return (response.data || []).map((log: Record<string, unknown>, index: number) =>
          normalizeLog(parent.id, log, index)
        );
      } catch {
        return [];
      }
    },
  },
};

async function startRedisSubscription(runId: string) {
  if (activeSubscriptions.has(runId)) {
    return;
  }
  
  activeSubscriptions.set(runId, true);
  
  try {
    const redis = await getRedisClient();
    const pubsub = redis.subscribeToUpdates(runId);
    
    (async () => {
      try {
        for await (const message of pubsub) {
          try {
            const data = JSON.parse(message);
            pubsub.publish(`AGENT_PROGRESS_${runId}`, {
              runId,
              ...data,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          } catch (e) {
            console.error('Error forwarding Redis message:', e);
          }
        }
      } catch (e) {
        console.error('Redis subscription error:', e);
      }
    })();
  } catch (e) {
    console.error('Error starting Redis subscription:', e);
  }
}
