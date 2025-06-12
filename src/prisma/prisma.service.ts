// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '../config/config.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    const dbConfig = configService.database;
    const isDevelopment = configService.app.environment === 'development';

    super({
      datasources: {
        db: {
          url: dbConfig.url,
        },
      },
      log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: isDevelopment ? 'pretty' : 'minimal',

      // 性能优化配置
      __internal: {
        engine: {
          // 连接池配置
          connectionLimit: dbConfig.maxConnections,
          poolTimeout: dbConfig.timeout,
          // 查询优化
          engineWasm: false,
        },
      },
    } as Prisma.PrismaClientOptions);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // 优化事务处理
  async executeTransaction<T>(
    fn: (
      prisma: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
      >,
    ) => Promise<T>,
    options?: {
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return await this.$transaction(fn, {
      timeout: options?.timeout ?? 10000,
      isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
    });
  }
}
