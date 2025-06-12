import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),

  // 连接优化
  keepAlive: 5000,
  connectTimeout: 10000,
  commandTimeout: 5000,

  // 重试策略
  maxRetriesPerRequest: 3,
  lazyConnect: true,

  // 缓存TTL配置
  ttl: {
    default: 3600,
    hotelInfo: 1800,
    roomAvailability: 300,
    bookingSession: 900,
  },

  // 分布式锁配置
  lock: {
    defaultExpire: 10,
  },
}));
