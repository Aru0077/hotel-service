import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');

      // 启用开发环境查询日志
      if (process.env.NODE_ENV === 'development') {
        // 使用类型安全的处理方式
        this.$on('query', (event) => {
          const queryEvent = event as Prisma.QueryEvent;
          this.logger.debug(`Query: ${queryEvent.query}`);
          this.logger.debug(`Duration: ${queryEvent.duration}ms`);
        });
      }

      this.$on('error', (event) => {
        const logEvent = event as Prisma.LogEvent;
        this.logger.error('Database error:', logEvent);
      });
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  // 更新关闭钩子 - 使用 NestJS 生命周期替代 beforeExit
  async enableShutdownHooks(app: any) {
    // 不再使用 beforeExit
    // 使用 process 事件替代
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  // 事务助手方法
  async executeTransaction<T>(
    fn: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  // 健康检查方法
  async isHealthy(): Promise<boolean> {
    try {
      // 使用类型安全的原始查询
      const result = await this.$queryRaw<{ result: number }[]>`SELECT 1`;
      return result.length > 0 && result[0].result === 1;
    } catch {
      return false;
    }
  }
}
