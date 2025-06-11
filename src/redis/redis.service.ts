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
  private subscriber: Redis;

  constructor(private readonly redisConfig: RedisConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      // 主实例用于缓存操作
      this.redis = this.redisConfig.createRedisInstance();
      // 订阅实例用于消息监听
      this.subscriber = this.redisConfig.createRedisInstance();

      await Promise.all([this.redis.connect(), this.subscriber.connect()]);

      this.logger.log('Redis连接已建立');
    } catch (error) {
      this.logger.error('Redis连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.redis?.quit(), this.subscriber?.quit()]);
    this.logger.log('Redis连接已关闭');
  }

  getClient(): Redis {
    return this.redis;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // 酒店预订系统专用缓存方法
  async cacheHotelInfo(
    hotelId: string,
    data: any,
    ttl: number = 1800,
  ): Promise<void> {
    const key = `hotel:info:${hotelId}`;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  // 获取酒店信息
  async getHotelInfo(hotelId: string): Promise<any> {
    const key = `hotel:info:${hotelId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 缓存房间可用性
  async cacheRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
    count: number,
  ): Promise<void> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    await this.redis.setex(key, 300, count); // 5分钟缓存
  }

  // 获取房间可用性
  async getRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
  ): Promise<number | null> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : null;
  }

  // 递减房间可用性
  async decrementRoomAvailability(
    hotelId: string,
    roomTypeId: string,
    date: string,
  ): Promise<number> {
    const key = `room:availability:${hotelId}:${roomTypeId}:${date}`;
    return await this.redis.decr(key);
  }

  // 缓存预订会话
  async cacheBookingSession(
    sessionId: string,
    data: any,
    ttl: number = 900,
  ): Promise<void> {
    const key = `booking:session:${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  // 获取预订会话
  async getBookingSession(sessionId: string): Promise<any> {
    const key = `booking:session:${sessionId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // 发布预订事件
  async publishBookingEvent(channel: string, data: any): Promise<number> {
    return await this.redis.publish(channel, JSON.stringify(data));
  }

  // 订阅预订事件
  async subscribeToBookingEvents(
    channel: string,
    callback: (data: any) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
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

  // 清除相关缓存
  async clearHotelCache(hotelId: string): Promise<void> {
    const pattern = `*:${hotelId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
