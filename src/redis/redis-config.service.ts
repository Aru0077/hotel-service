// src/redis/redis-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConfigService {
  constructor(private readonly configService: ConfigService) {}

  // src/redis/redis-config.service.ts
  createRedisInstance(): Redis {
    return new Redis({
      // 基本连接配置
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),

      // 连接优化
      keepAlive: 5000,
      connectTimeout: 10000,
      commandTimeout: 5000,

      // 重试策略
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        // 指数退避重试策略
        if (times > 10) return null; // 超过10次重试则放弃
        return Math.min(times * 200, 2000); // 指数退避，最大2秒间隔
      },

      // 连接管理
      lazyConnect: true,
      enableOfflineQueue: false,

      // 集群支持
      family: 4,
      enableReadyCheck: true,

      connectionName: 'booking-service', // 连接标识
      showFriendlyErrorStack: process.env.NODE_ENV === 'development', // 错误处理
    });
  }

  getMicroserviceOptions() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }
}
