import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

interface LockOptions {
  ttl?: number; // 锁的过期时间(秒)，默认10秒
  retryTimes?: number; // 重试次数，默认3次
  retryDelay?: number; // 重试间隔(毫秒)，默认100ms
}

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly DEFAULT_TTL = 10; // 10秒
  private readonly DEFAULT_RETRY_TIMES = 3;
  private readonly DEFAULT_RETRY_DELAY = 100;

  constructor(private readonly redisService: RedisService) {}

  /**
   * 获取分布式锁
   * @param lockKey 锁的唯一标识
   * @param options 锁的配置选项
   * @returns 是否成功获取锁
   */
  async acquireLock(
    lockKey: string,
    options: LockOptions = {},
  ): Promise<string | null> {
    const {
      ttl = this.DEFAULT_TTL,
      retryTimes = this.DEFAULT_RETRY_TIMES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
    } = options;

    const lockValue = this.generateLockValue();
    const fullLockKey = `lock:${lockKey}`;

    for (let attempt = 0; attempt <= retryTimes; attempt++) {
      try {
        const result = await this.redisService
          .getClient()
          .set(fullLockKey, lockValue, 'EX', ttl, 'NX');

        if (result === 'OK') {
          this.logger.debug(`成功获取锁: ${lockKey}`);
          return lockValue;
        }

        if (attempt < retryTimes) {
          await this.delay(retryDelay);
        }
      } catch (error) {
        this.logger.error(`获取锁失败: ${lockKey}`, error);
        throw error;
      }
    }

    this.logger.warn(`获取锁超时: ${lockKey}`);
    return null;
  }

  /**
   * 释放分布式锁
   * @param lockKey 锁的唯一标识
   * @param lockValue 锁的值，用于确保只能释放自己持有的锁
   * @returns 是否成功释放锁
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const fullLockKey = `lock:${lockKey}`;

    // 使用Lua脚本确保原子性操作
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = (await this.redisService
        .getClient()
        .eval(luaScript, 1, fullLockKey, lockValue)) as number;

      if (result === 1) {
        this.logger.debug(`成功释放锁: ${lockKey}`);
        return true;
      } else {
        this.logger.warn(`释放锁失败，锁不存在或已被其他进程释放: ${lockKey}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`释放锁异常: ${lockKey}`, error);
      throw error;
    }
  }

  /**
   * 执行带锁的业务逻辑
   * @param lockKey 锁的唯一标识
   * @param callback 需要执行的业务逻辑
   * @param options 锁的配置选项
   * @returns 业务逻辑的执行结果
   */
  async executeWithLock<T>(
    lockKey: string,
    callback: () => Promise<T>,
    options: LockOptions = {},
  ): Promise<T> {
    const lockValue = await this.acquireLock(lockKey, options);

    if (!lockValue) {
      throw new Error(`无法获取锁: ${lockKey}`);
    }

    try {
      return await callback();
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 延长锁的过期时间
   * @param lockKey 锁的唯一标识
   * @param lockValue 锁的值
   * @param ttl 新的过期时间(秒)
   * @returns 是否成功延长
   */
  async renewLock(
    lockKey: string,
    lockValue: string,
    ttl: number,
  ): Promise<boolean> {
    const fullLockKey = `lock:${lockKey}`;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    try {
      const result = (await this.redisService
        .getClient()
        .eval(luaScript, 1, fullLockKey, lockValue, ttl)) as number;

      return result === 1;
    } catch (error) {
      this.logger.error(`续期锁失败: ${lockKey}`, error);
      return false;
    }
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
