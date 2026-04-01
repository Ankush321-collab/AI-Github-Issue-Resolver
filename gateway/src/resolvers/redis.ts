import { createClient, RedisClientType } from 'redis';

export interface RedisClient {
  connect(): Promise<void>;
  subscribeToUpdates(runId: string): AsyncIterable<string>;
  publish(channel: string, message: string): Promise<void>;
  close(): Promise<void>;
}

export function createRedisClient(host: string, port: number): RedisClient {
  let client: RedisClientType | null = null;

  return {
    async connect(): Promise<void> {
      client = createClient({
        socket: {
          host,
          port,
        },
      });
      
      client.on('error', (err) => console.error('Redis Client Error:', err));
      
      await client.connect();
      console.log('Gateway Redis connected');
    },

    subscribeToUpdates(runId: string): AsyncIterable<string> {
      const channel = `agent_updates:${runId}`;
      const messages: string[] = [];
      let resolver: ((value: string) => void) | null = null;
      let connected = false;

      if (client) {
        client.subscribe(channel, (message) => {
          messages.push(message);
          if (resolver) {
            const r = resolver;
            resolver = null;
            r(message);
          }
        });
        connected = true;
      }

      return {
        [Symbol.asyncIterator]() {
          return {
            next(): Promise<IteratorResult<string>> {
              if (messages.length > 0) {
                return Promise.resolve({ done: false, value: messages.shift()! });
              }
              
              return new Promise((resolve) => {
                resolver = (value) => resolve({ done: false, value });
              });
            },
          };
        },
      };
    },

    async publish(channel: string, message: string): Promise<void> {
      if (client) {
        await client.publish(channel, message);
      }
    },

    async close(): Promise<void> {
      if (client) {
        await client.quit();
      }
    },
  };
}
