import Redis from 'ioredis';

const redisUrl = process.env.ikatsumutsumu_REDIS_URL || process.env.REDIS_URL || '';
export const redis = redisUrl ? new Redis(redisUrl) : null;
