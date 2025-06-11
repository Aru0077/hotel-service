// src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RedisConfigService } from './redis-config.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'BOOKING_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            retryAttempts: 5,
            retryDelay: 3000,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [RedisConfigService, RedisService],
  exports: [RedisService, ClientsModule],
})
export class RedisModule {}
