import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // 应用配置
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // 数据库配置
  DATABASE_URL: Joi.string().required(),
  DATABASE_MAX_CONNECTIONS: Joi.number().default(10),
  DATABASE_TIMEOUT: Joi.number().default(20000),

  // Redis配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_MAX_RETRIES: Joi.number().default(3),
  REDIS_CONNECT_TIMEOUT: Joi.number().default(10000),
  REDIS_COMMAND_TIMEOUT: Joi.number().default(5000),

  // JWT配置
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
});
