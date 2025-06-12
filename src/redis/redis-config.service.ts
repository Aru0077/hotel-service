// src/redis/redis-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import Redis from 'ioredis';

@Injectable()
export class RedisConfigService {
  constructor(private readonly configService: ConfigService) {}

  // src/redis/redis-config.service.ts
  createRedisInstance(): Redis {
    const config = this.configService.redis;

    return new Redis({
      // 基本连接配置
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,

      // 性能优化配置
      keepAlive: 5000,
      connectTimeout: config.connectTimeout,
      commandTimeout: config.commandTimeout,
      maxRetriesPerRequest: config.maxRetries,

      // 优化的重试策略
      retryStrategy: (times) => {
        if (times > config.maxRetries) return null;
        return Math.min(times * 200, 2000);
      },

      // 连接池优化
      lazyConnect: true,
      enableOfflineQueue: false,
      family: 4,
      enableReadyCheck: true,
      connectionName: 'hotel-service',
    });
  }
}
