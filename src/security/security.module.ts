// ===============================
// 修正后的安全模块
// src/security/security.module.ts
// ===============================
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '../config/config.service';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
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
        // 忽略搜索引擎爬虫
        ignoreUserAgents: [/googlebot/gi, /bingbot/gi, /baiduspider/gi],
        // 跳过健康检查端点的限流
        skipIf: (context: ExecutionContext): boolean => {
          const request = context.switchToHttp().getRequest<Request>();
          const url = request.url;

          // 跳过健康检查相关端点
          const skipPaths = ['/health', '/metrics', '/favicon.ico'];
          return skipPaths.some((path) => url?.includes(path));
        },
        // 可选：基于环境的配置
        errorMessage:
          configService.app.environment === 'development'
            ? '请求过于频繁，请稍后再试'
            : 'Too many requests',
      }),
    }),
  ],
})
export class SecurityModule {}
