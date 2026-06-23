import Redis from 'ioredis';
import { config } from './config';

const redisUrl = config.redisUrl || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.warn('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis at', redisUrl);
});

export default redis;
