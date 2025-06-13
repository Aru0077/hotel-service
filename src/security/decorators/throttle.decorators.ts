// ===============================
// 2. 简化版安全装饰器
// src/security/decorators/throttle.decorators.ts
// ===============================
import { SetMetadata } from '@nestjs/common';

// 跳过速率限制
export const SkipThrottle = () => SetMetadata('skipThrottle', true);

// 严格速率限制 - 用于支付、登录等敏感操作
export const StrictThrottle = () =>
  SetMetadata('throttleConfig', {
    default: { limit: 10, ttl: 60000 }, // 每分钟10次
  });
