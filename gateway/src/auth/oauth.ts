import crypto from 'crypto';

import { redisDel, redisGet, redisSet } from './redis_store.js';

const STATE_TTL_SECONDS = 5 * 60;

const stateKey = (state: string) => `oauth:state:${state}`;

export async function createOAuthState(provider: string): Promise<string> {
  const state = crypto.randomBytes(24).toString('hex');
  await redisSet(stateKey(state), provider, STATE_TTL_SECONDS);
  return state;
}

export async function consumeOAuthState(
  state: string,
  provider: string
): Promise<boolean> {
  const stored = await redisGet(stateKey(state));
  if (!stored || stored !== provider) {
    return false;
  }
  await redisDel(stateKey(state));
  return true;
}
