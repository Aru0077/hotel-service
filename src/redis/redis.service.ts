import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from './redis-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private subscribers: Map<string, Redis> = new Map();

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
    const closePromises = [this.redis?.quit()];
    for (const subscriber of this.subscribers.values()) {
      closePromises.push(subscriber.quit());
    }
    await Promise.all(closePromises);
    this.subscribers.clear();
    this.logger.log('Redis连接已关闭');
  }

  getClient(): Redis {
    return this.redis;
  }

  // 通用缓存方法
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
    return data ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  // 分布式锁实现
  async acquireLock(
    lockKey: string,
    expireTime: number = 10,
  ): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${lockKey}`,
      Date.now().toString(),
      'EX',
      expireTime,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(`lock:${lockKey}`);
  }

  // 发布订阅功能
  async publish(channel: string, data: any): Promise<number> {
    return await this.redis.publish(channel, JSON.stringify(data));
  }

  async subscribe(
    channel: string,
    callback: (data: any) => void,
  ): Promise<void> {
    if (this.subscribers.has(channel)) {
      this.logger.warn(`频道 ${channel} 已存在订阅`);
      return;
    }

    const subscriber = this.redis.duplicate();
    try {
      await subscriber.subscribe(channel);
      this.subscribers.set(channel, subscriber);

      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message);
            callback(data);
          } catch (error) {
            this.logger.error('消息解析失败', error);
          }
        }
      });
    } catch (error) {
      await subscriber.quit();
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel);
    if (subscriber) {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.subscribers.delete(channel);
    }
  }

  // 使用SCAN替代KEYS的批量删除方法
  async deleteByPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      const result = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        deletedCount += await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    return deletedCount;
  }
}
