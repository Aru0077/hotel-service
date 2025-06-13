import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// 导入配置文件
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, HealthModule],
  controllers: [],
  providers: [
    // Prisma异常过滤器
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 响应转换拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
