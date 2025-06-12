import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('数据库健康检查失败', error);
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      const result = await this.redisService.getClient().ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis健康检查失败', error);
      return false;
    }
  }

  async performDetailedHealthCheck(): Promise<{
    database: { healthy: boolean; responseTime?: number };
    redis: { healthy: boolean; responseTime?: number };
  }> {
    const results = await Promise.allSettled([
      this.measureDatabaseHealth(),
      this.measureRedisHealth(),
    ]);

    return {
      database:
        results[0].status === 'fulfilled'
          ? results[0].value
          : { healthy: false },
      redis:
        results[1].status === 'fulfilled'
          ? results[1].value
          : { healthy: false },
    };
  }

  private async measureDatabaseHealth(): Promise<{
    healthy: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('数据库性能检查失败', error);
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async measureRedisHealth(): Promise<{
    healthy: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    try {
      const result = await this.redisService.getClient().ping();
      return {
        healthy: result === 'PONG',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Redis性能检查失败', error);
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
      };
    }
  }
}
