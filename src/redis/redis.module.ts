import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisConfigService } from './redis-config.service';
import { DistributedLockService } from './distributed-lock.service';
import { EventService } from './event.service';

@Global()
@Module({
  providers: [
    RedisConfigService,
    RedisService,
    DistributedLockService,
    EventService,
  ],
  exports: [RedisService, DistributedLockService, EventService],
})
export class RedisModule {}
