import axios from 'axios';
import { createRedisClient, RedisClient } from './redis.js';
import { ORCHESTRATOR_URL, AgentRun, TaskLog, StartRunResponse, AgentRunUpdate, AgentProgress } from '../types/index.js';
import { pubsub } from '../types/index.js';

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

export const resolvers = {
  Query: {
    getRuns: async (_: unknown, args: { limit?: number; offset?: number }): Promise<AgentRun[]> => {
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs`, {
          params: { limit: args.limit || 50, offset: args.offset || 0 },
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching runs:', error);
        return [];
      }
    },

    getRunDetails: async (_: unknown, args: { id: string }): Promise<AgentRun | null> => {
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${args.id}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching run details:', error);
        return null;
      }
    },

    getLogs: async (_: unknown, args: { runId: string }): Promise<TaskLog[]> => {
      try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/logs`);
        return response.data;
      } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
      }
    },
  },

  Mutation: {
    startRun: async (_: unknown, args: { issue: string; repoUrl: string }): Promise<StartRunResponse> => {
      try {
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs`, {
          issue: args.issue,
          repo_url: args.repoUrl,
        });
        
        const runId = response.data.id;
        startRedisSubscription(runId);
        
        return response.data;
      } catch (error) {
        console.error('Error starting run:', error);
        throw new Error('Failed to start run');
      }
    },

    retryRun: async (_: unknown, args: { runId: string }): Promise<StartRunResponse> => {
      try {
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/retry`);
        startRedisSubscription(args.runId);
        return response.data;
      } catch (error) {
        console.error('Error retrying run:', error);
        throw new Error('Failed to retry run');
      }
    },

    cancelRun: async (_: unknown, args: { runId: string }): Promise<StartRunResponse> => {
      try {
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/runs/${args.runId}/cancel`);
        return response.data;
      } catch (error) {
        console.error('Error cancelling run:', error);
        throw new Error('Failed to cancel run');
      }
    },
  },

  Subscription: {
    agentProgress: {
      subscribe: async function* (_: unknown, args: { runId: string }) {
        const runId = args.runId;
        
        try {
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
        return response.data;
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
