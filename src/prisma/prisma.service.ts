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
    const isDevelopment = configService.app.environment === 'development';

    super({
      datasources: {
        db: {
          url: configService.database.url,
        },
      },
      log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: isDevelopment ? 'pretty' : 'minimal',
    } as Prisma.PrismaClientOptions);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    // 记录连接信息（不包含敏感数据）
    const connectionInfo = this.configService.getDatabaseConnectionInfo();
    console.log(
      `数据库连接已建立: ${connectionInfo.host}:${connectionInfo.port}/${connectionInfo.database}`,
    );

    if (connectionInfo.connectionLimit) {
      console.log(`连接池大小: ${connectionInfo.connectionLimit}`);
    }
    if (connectionInfo.connectTimeout) {
      console.log(`连接超时: ${connectionInfo.connectTimeout}秒`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
