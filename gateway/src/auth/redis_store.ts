import { createClient, RedisClientType } from 'redis';

const REDIS_HOST = process.env.REDIS_HOST as string;
const REDIS_PORT = parseInt(process.env.REDIS_PORT as string, 10);

let client: RedisClientType | null = null;
let connecting: Promise<void> | null = null;

async function getClient(): Promise<RedisClientType> {
  if (client) {
    return client;
  }
  if (!connecting) {
    client = createClient({
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    });

    client.on('error', (err) => console.error('Auth Redis Error:', err));

    connecting = client.connect().then(() => {
      console.log('Auth Redis connected');
    });
  }

  await connecting;
  if (!client) {
    throw new Error('Redis client failed to initialize');
  }
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  const redis = await getClient();
  return redis.get(key);
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const redis = await getClient();
  if (ttlSeconds) {
    await redis.set(key, value, { EX: ttlSeconds });
  } else {
    await redis.set(key, value);
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = await getClient();
  await redis.del(key);
}
