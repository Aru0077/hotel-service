// 9. 性能监控装饰器 - src/common/decorators/performance.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERFORMANCE_KEY = 'performance';
export const Performance = (threshold?: number) =>
  SetMetadata(PERFORMANCE_KEY, threshold || 1000);
