import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_FILTER } from '@nestjs/core';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';

// 导入配置文件
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, HealthModule],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
  ],
})
export class AppModule {}
