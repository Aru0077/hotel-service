// ===============================
// 1. 简化版安全模块
// src/security/security.module.ts
// ===============================
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '../config/config.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1分钟
            limit: 100, // 每分钟100个请求
          },
          {
            name: 'strict',
            ttl: 60000, // 1分钟
            limit: 10, // 敏感操作每分钟10次
          },
        ],
        ignoreUserAgents: [/googlebot/gi, /bingbot/gi],
        skipIf: (context) => {
          const request = context.switchToHttp().getRequest();
          return request.url?.includes('/health');
        },
      }),
    }),
  ],
})
export class SecurityModule {}
