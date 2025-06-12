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

    // 构建优化的数据库连接配置
    const connectionUrl = new URL(dbConfig.url);
    connectionUrl.searchParams.set(
      'connection_limit',
      dbConfig.maxConnections.toString(),
    );
    connectionUrl.searchParams.set(
      'pool_timeout',
      (dbConfig.timeout / 1000).toString(),
    );

    super({
      datasources: {
        db: {
          url: connectionUrl.toString(),
        },
      },
      log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: isDevelopment ? 'pretty' : 'minimal',
    } as Prisma.PrismaClientOptions);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
