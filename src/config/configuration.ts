// src/config/configuration.ts
import { registerAs } from '@nestjs/config';
import Joi from 'joi';

// 环境变量验证 schema
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  // 数据库配置
  DATABASE_URL: Joi.string().required(),

  // Redis配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),

  // JWT配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // CORS配置
  CORS_ORIGIN: Joi.string().default('*'),
});

// 统一配置对象
export default registerAs('app', () => {
  const config = {
    // 应用基础配置
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '3000', 10),
    globalPrefix: 'api/v1',

    // 数据库配置
    database: {
      url: process.env.DATABASE_URL,
      logging:
        process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      connectTimeout: 10000,
    },

    // Redis配置
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),

      // 连接优化
      keepAlive: 5000,
      connectTimeout: 10000,
      commandTimeout: 5000,
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
    },

    // JWT配置
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    // CORS配置
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || '*',
    },
  };

  return config;
});
