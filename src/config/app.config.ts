import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  // 全局前缀
  globalPrefix: 'api/v1',

  // CORS配置
  cors: {
    enabled: true,
    origin: process.env.CORS_ORIGIN ?? '*',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
}));
