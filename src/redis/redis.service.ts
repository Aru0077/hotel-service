// src/redis/redis.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from './redis-config.service';

interface BookingEventData {
  eventType: string;
  bookingId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private subscribers: Map<string, Redis> = new Map();

  constructor(private readonly redisConfig: RedisConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      // 使用单一连接实例，支持发布订阅
      this.redis = this.redisConfig.createRedisInstance();
      await this.redis.connect();
      this.logger.log('Redis连接已建立');
    } catch (error) {
      this.logger.error('Redis连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 关闭主连接和所有订阅连接
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

  // 酒店预订系统专用缓存方法 （ 重要 ）
  async cacheHotelInfo(
    hotelId: string,
    data: any,
    ttl: number = 1800,
  ): Promise<void> {
    const key = `hotel:info:${hotelId}`;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  // 获取酒店信息 （ 重要 ）
  async getHotelInfo(hotelId: string): Promise<any> {
    const key = `hotel:info:${hotelId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 缓存房间可用性 （ 重要 ）
  async cacheRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
    count: number,
  ): Promise<void> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    await this.redis.setex(key, 300, count); // 5分钟缓存
  }

  // 获取房间可用性 （ 重要 ）
  async getRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
  ): Promise<number | null> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : null;
  }

  // 递减房间可用性 （ 重要 ）
  async decrementRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
  ): Promise<number> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    return await this.redis.decr(key);
  }

  // 缓存预订会话 （ 管理用户预订流程中的临时数据，如果您的系统采用无状态设计或使用其他会话管理机制，这些方法可以考虑移除 ）
  async cacheBookingSession(
    sessionId: string,
    data: any,
    ttl: number = 900,
  ): Promise<void> {
    const key = `booking:session:${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  // 获取预订会话 （ 管理用户预订流程中的临时数据，如果您的系统采用无状态设计或使用其他会话管理机制，这些方法可以考虑移除 ）
  async getBookingSession(sessionId: string): Promise<any> {
    const key = `booking:session:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 发布预订事件 （ 事件驱动架构，如果系统不需要实时事件通知或采用其他消息队列方案，可以移除这些方法 ）
  async publishBookingEvent(channel: string, data: any): Promise<number> {
    return await this.redis.publish(channel, JSON.stringify(data));
  }

  // 订阅预订事件的优化实现 （ 事件驱动架构，如果系统不需要实时事件通知或采用其他消息队列方案，可以移除这些方法 ）
  async subscribeToBookingEvents(
    channel: string,
    callback: (data: any) => void,
  ): Promise<void> {
    // 检查是否已存在该频道的订阅
    if (this.subscribers.has(channel)) {
      this.logger.warn(`频道 ${channel} 已存在订阅`);
      return;
    }

    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    this.subscribers.set(channel, subscriber);

    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const data = JSON.parse(message) as BookingEventData;
          callback(data);
        } catch (error) {
          this.logger.error('消息解析失败', error);
        }
      }
    });
  }
  // 取消订阅方法
  async unsubscribeFromBookingEvents(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel);
    if (subscriber) {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.subscribers.delete(channel);
    }
  }

  // 分布式锁实现（用于防止重复预订）
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

  // 分布式锁功能
  async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(`lock:${lockKey}`);
  }

  // 清除相关缓存 （ 批量清理缓存。虽然有用，但使用keys命令在生产环境中可能影响性能，建议改用更高效的实现方式或在非必要情况下移除。 ）
  async clearHotelCache(hotelId: string): Promise<void> {
    const pattern = `*:${hotelId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
