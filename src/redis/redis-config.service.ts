// src/redis/redis-config.service.ts (精简版)
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConfigService {
  constructor(private readonly configService: ConfigService) {}

  createRedisInstance(): Redis {
    const redisConfig = this.configService.get('app.redis');

    return new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keepAlive: redisConfig.keepAlive,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      lazyConnect: redisConfig.lazyConnect,
      retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
      },
      enableOfflineQueue: false,
      family: 4,
      enableReadyCheck: true,
      connectionName: 'hotel-service',
      showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    });
  }

  getMicroserviceOptions() {
    const redisConfig = this.configService.get('app.redis');

    return {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }
}
