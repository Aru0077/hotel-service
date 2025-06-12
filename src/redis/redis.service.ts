import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from './redis-config.service';
import { ErrorUtil } from '../common/utils/error.util';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  constructor(private readonly redisConfig: RedisConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.redis = this.redisConfig.createRedisInstance();
      await this.redis.connect();
      this.logger.log('Redis连接已建立');
    } catch (error) {
      this.logger.error('Redis连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis连接已关闭');
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  private serialize(value: any): string {
    return JSON.stringify(value);
  }

  private deserialize<T>(data: string): T | null {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`JSON解析失败`, ErrorUtil.getErrorMessage(error));
      return null;
    }
  }

  // 核心缓存操作
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? this.deserialize<T>(data) : null;
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  // 数值操作
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  async incrby(key: string, value: number): Promise<number> {
    return await this.redis.incrby(key, value);
  }

  // 设置过期时间
  async expire(key: string, ttl: number): Promise<boolean> {
    return (await this.redis.expire(key, ttl)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  // 批量操作
  async mget(keys: string[]): Promise<(string | null)[]> {
    return await this.redis.mget(...keys);
  }

  async mset(keyValuePairs: Record<string, any>): Promise<void> {
    const pairs: string[] = [];
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      pairs.push(key, JSON.stringify(value));
    });
    await this.redis.mset(...pairs);
  }
}
