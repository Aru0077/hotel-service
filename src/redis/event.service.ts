import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from './redis-config.service';

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

  constructor(private readonly redisConfig: RedisConfigService) {}

  async onModuleDestroy(): Promise<void> {
    const closePromises = Array.from(this.subscribers.values()).map(
      (subscriber) => subscriber.quit(),
    );
    await Promise.all(closePromises);
    this.subscribers.clear();
    this.eventHandlers.clear();
    this.logger.log('所有事件订阅连接已关闭');
  }

  /**
   * 发布事件
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
    const eventData: EventData = {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      data,
      metadata,
    };

    try {
      // 获取发布专用的Redis连接
      const publisher = this.redisConfig.createRedisInstance();
      await publisher.connect();

      const subscriberCount = await publisher.publish(
        channel,
        JSON.stringify(eventData),
      );

      await publisher.quit();

      this.logger.debug(
        `事件已发布 - 频道: ${channel}, 订阅者: ${subscriberCount}`,
      );

      return subscriberCount;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`发布事件失败 - 频道: ${channel}`, errorMessage);
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

        // 设置消息处理器 - 修复Promise返回类型问题
        subscriber.on('message', (receivedChannel: string, message: string) => {
          if (receivedChannel === channel) {
            // 使用setImmediate确保异步处理不阻塞事件循环
            setImmediate(() => {
              this.handleMessage(channel, message).catch((error) => {
                const errorMessage = this.getErrorMessage(error);
                this.logger.error(
                  `处理消息异常 - 频道: ${channel}`,
                  errorMessage,
                );
              });
            });
          }
        });

        subscriber.on('error', (error: Error) => {
          const errorMessage = this.getErrorMessage(error);
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
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`订阅事件失败 - 频道: ${channel}`, errorMessage);
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
        // 移除特定的处理器
        handlers.delete(handler);
        this.logger.debug(`已移除事件处理器 - 频道: ${channel}`);

        // 如果没有更多处理器，取消整个频道的订阅
        if (handlers.size === 0) {
          await this.unsubscribeChannel(channel);
        }
      } else {
        // 取消整个频道的订阅
        await this.unsubscribeChannel(channel);
      }
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`取消订阅失败 - 频道: ${channel}`, errorMessage);
      throw error;
    }
  }

  /**
   * 批量发布事件
   * @param events 事件列表，每个事件包含频道和数据
   */
  async publishBatchEvents(
    events: Array<{
      channel: string;
      data: unknown;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const publisher = this.redisConfig.createRedisInstance();
    await publisher.connect();

    try {
      const pipeline = publisher.pipeline();

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
    } finally {
      await publisher.quit();
    }
  }

  /**
   * 获取当前所有活跃的订阅频道
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscribers.keys());
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    try {
      const eventData = JSON.parse(message) as EventData;
      const handlers = this.eventHandlers.get(channel);

      if (handlers && handlers.size > 0) {
        // 并行执行所有处理器
        const handlerPromises = Array.from(handlers).map(async (handler) => {
          try {
            await handler(eventData);
          } catch (error) {
            const errorMessage = this.getErrorMessage(error);
            this.logger.error(
              `事件处理器执行失败 - 频道: ${channel}, 事件ID: ${eventData.eventId}`,
              errorMessage,
            );
          }
        });

        await Promise.allSettled(handlerPromises);
      }
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
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

  /**
   * 安全地提取错误消息
   * @param error 错误对象
   * @returns 错误消息字符串
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '未知错误';
  }
}
