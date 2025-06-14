import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from './redis-config.service';
import { ErrorUtil } from '../common/utils/error.util';

interface EventData {
  eventId: string;
  timestamp: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}

type EventHandler = (eventData: EventData) => Promise<void> | void;

@Injectable()
export class EventService implements OnModuleDestroy {
  private readonly logger = new Logger(EventService.name);
  private readonly subscribers: Map<string, Redis> = new Map();
  private readonly eventHandlers: Map<string, Set<EventHandler>> = new Map();

  // 添加专用的发布者连接池
  private publisher: Redis;
  private publisherReady = false;

  constructor(private readonly redisConfig: RedisConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      // 初始化专用发布者连接
      this.publisher = this.redisConfig.createRedisInstance();
      await this.publisher.connect();
      this.publisherReady = true;
      this.logger.log('事件发布者连接已建立');
    } catch (error) {
      this.logger.error('事件发布者连接失败', error);
      this.publisherReady = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    // 关闭发布者连接
    if (this.publisher) {
      await this.publisher.quit();
      this.logger.log('事件发布者连接已关闭');
    }

    // 关闭所有订阅者连接
    const closePromises = Array.from(this.subscribers.values()).map(
      (subscriber) => subscriber.quit(),
    );

    await Promise.all(closePromises);
    this.subscribers.clear();
    this.eventHandlers.clear();
    this.logger.log('所有事件订阅连接已关闭');
  }

  /**
   * 发布事件 - 使用复用连接
   * @param channel 事件频道
   * @param data 事件数据
   * @param metadata 事件元数据
   * @returns 接收到事件的订阅者数量
   */
  async publishEvent(
    channel: string,
    data: unknown,
    metadata?: Record<string, unknown>,
  ): Promise<number> {
    if (!this.publisherReady || !this.publisher) {
      throw new Error('事件发布者连接未就绪');
    }

    const eventData: EventData = {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      data,
      metadata,
    };

    try {
      // 直接使用复用的发布者连接
      const subscriberCount = await this.publisher.publish(
        channel,
        JSON.stringify(eventData),
      );

      this.logger.debug(
        `事件已发布 - 频道: ${channel}, 订阅者: ${subscriberCount}`,
      );

      return subscriberCount;
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      this.logger.error(`发布事件失败 - 频道: ${channel}`, errorMessage);

      // 如果连接出现问题，尝试重新连接
      await this.reconnectPublisher();
      throw error;
    }
  }

  /**
   * 订阅事件
   * @param channel 事件频道
   * @param handler 事件处理函数
   */
  async subscribeEvent(channel: string, handler: EventHandler): Promise<void> {
    try {
      // 如果是第一次订阅这个频道，创建新的Redis连接
      if (!this.subscribers.has(channel)) {
        const subscriber = this.redisConfig.createRedisInstance();
        await subscriber.connect();
        await subscriber.subscribe(channel);
        this.subscribers.set(channel, subscriber);
        this.eventHandlers.set(channel, new Set());

        // 设置消息处理器
        subscriber.on('message', (receivedChannel: string, message: string) => {
          if (receivedChannel === channel) {
            setImmediate(() => {
              this.handleMessage(channel, message).catch((error) => {
                const errorMessage = ErrorUtil.getErrorMessage(error);
                this.logger.error(
                  `处理消息异常 - 频道: ${channel}`,
                  errorMessage,
                );
              });
            });
          }
        });

        subscriber.on('error', (error: Error) => {
          const errorMessage = ErrorUtil.getErrorMessage(error);
          this.logger.error(`订阅频道 ${channel} 发生错误:`, errorMessage);
        });

        this.logger.log(`已订阅事件频道: ${channel}`);
      }

      // 添加事件处理器
      const handlers = this.eventHandlers.get(channel);
      if (handlers) {
        handlers.add(handler);
        this.logger.debug(`已添加事件处理器 - 频道: ${channel}`);
      }
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      this.logger.error(`订阅事件失败 - 频道: ${channel}`, errorMessage);
      throw error;
    }
  }

  /**
   * 批量发布事件 - 使用管道优化
   * @param events 事件列表，每个事件包含频道和数据
   */
  async publishBatchEvents(
    events: Array<{
      channel: string;
      data: unknown;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (!this.publisherReady || !this.publisher) {
      throw new Error('事件发布者连接未就绪');
    }

    try {
      // 使用管道批量发布，提高性能
      const pipeline = this.publisher.pipeline();

      events.forEach(({ channel, data, metadata }) => {
        const eventData: EventData = {
          eventId: this.generateEventId(),
          timestamp: Date.now(),
          data,
          metadata,
        };

        pipeline.publish(channel, JSON.stringify(eventData));
      });

      await pipeline.exec();
      this.logger.debug(`批量发布了 ${events.length} 个事件`);
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      this.logger.error('批量发布事件失败', errorMessage);

      // 尝试重新连接
      await this.reconnectPublisher();
      throw error;
    }
  }

  /**
   * 取消订阅事件
   * @param channel 事件频道
   * @param handler 可选的特定处理函数
   */
  async unsubscribeEvent(
    channel: string,
    handler?: EventHandler,
  ): Promise<void> {
    const subscriber = this.subscribers.get(channel);
    const handlers = this.eventHandlers.get(channel);

    if (!subscriber || !handlers) {
      this.logger.warn(`尝试取消不存在的订阅 - 频道: ${channel}`);
      return;
    }

    try {
      if (handler) {
        handlers.delete(handler);
        this.logger.debug(`已移除事件处理器 - 频道: ${channel}`);

        if (handlers.size === 0) {
          await this.unsubscribeChannel(channel);
        }
      } else {
        await this.unsubscribeChannel(channel);
      }
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      this.logger.error(`取消订阅失败 - 频道: ${channel}`, errorMessage);
      throw error;
    }
  }

  /**
   * 获取当前所有活跃的订阅频道
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * 检查发布者连接状态
   */
  isPublisherReady(): boolean {
    return this.publisherReady && this.publisher?.status === 'ready';
  }

  /**
   * 重新连接发布者
   */
  private async reconnectPublisher(): Promise<void> {
    try {
      this.publisherReady = false;

      if (this.publisher) {
        await this.publisher.quit();
      }

      this.publisher = this.redisConfig.createRedisInstance();
      await this.publisher.connect();
      this.publisherReady = true;

      this.logger.log('事件发布者重新连接成功');
    } catch (error) {
      this.logger.error('事件发布者重新连接失败', error);
      this.publisherReady = false;
    }
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const eventData = JSON.parse(message) as EventData;
      const handlers = this.eventHandlers.get(channel);

      if (handlers && handlers.size > 0) {
        const handlerPromises = Array.from(handlers).map(async (handler) => {
          try {
            await handler(eventData);
          } catch (error) {
            const errorMessage = ErrorUtil.getErrorMessage(error);
            this.logger.error(
              `事件处理器执行失败 - 频道: ${channel}, 事件ID: ${eventData.eventId}`,
              errorMessage,
            );
          }
        });

        await Promise.allSettled(handlerPromises);
      }
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      this.logger.error(`消息解析失败 - 频道: ${channel}`, errorMessage);
    }
  }

  private async unsubscribeChannel(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel);

    if (subscriber) {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.subscribers.delete(channel);
      this.eventHandlers.delete(channel);
      this.logger.log(`已取消订阅事件频道: ${channel}`);
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
