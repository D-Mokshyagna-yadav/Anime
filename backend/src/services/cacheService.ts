import Redis from 'ioredis';

const localCache = new Map<string, { data: unknown; expiresAt: number }>();

let redis: Redis | null = null;
let redisInitialized = false;

const getRedis = (): Redis | null => {
  if (redisInitialized) return redis;
  redisInitialized = true;
  
  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      connectTimeout: 500,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });
    
    client.on('error', (err) => {
      console.warn('[Cache] Redis error, falling back to local cache:', err.message);
      redis = null;
    });
    
    redis = client;
    return client;
  } catch (err) {
    console.warn('[Cache] Redis initialization failed:', String(err));
    return null;
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  // Check local cache first
  const local = localCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return local.data as T;
  }
  
  // Try Redis with timeout
  const r = getRedis();
  if (r) {
    try {
      // Set a timeout for the Redis get operation
      const redisPromise = r.get(key);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 500)
      );
      
      const val = await Promise.race([redisPromise, timeoutPromise]) as string | null;
      if (val) return JSON.parse(val) as T;
    } catch (err) {
      console.debug('[Cache] Redis get failed, using local cache:', String(err));
      // Fall through to local cache
    }
  }
  
  return null;
};

export const cacheSet = async (key: string, data: unknown, ttlSeconds = 300): Promise<void> => {
  // Always set in local cache
  localCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
  
  // Try to set in Redis without blocking
  const r = getRedis();
  if (r) {
    try {
      const setexPromise = r.setex(key, ttlSeconds, JSON.stringify(data));
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(null), 300)
      );
      
      await Promise.race([setexPromise, timeoutPromise]);
    } catch (err) {
      console.debug('[Cache] Redis set failed:', String(err));
      // Continue - local cache is already set
    }
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  localCache.delete(key);
  const r = getRedis();
  if (r) {
    try {
      const delPromise = r.del(key);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(null), 300)
      );
      
      await Promise.race([delPromise, timeoutPromise]);
    } catch { /* ignore */ }
  }
};
