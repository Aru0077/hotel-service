import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,

  // Prisma配置
  logging:
    process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],

  // 连接配置
  connectTimeout: 10000,
}));
