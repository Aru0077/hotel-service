// ===============================
// 修正后的限流装饰器 - 使用官方推荐方式
// src/security/decorators/throttle.decorators.ts
// ===============================

// 直接导出官方装饰器，无需自定义实现
export { SkipThrottle, Throttle } from '@nestjs/throttler';

// 如果需要预设配置，可以创建便捷函数
import { Throttle } from '@nestjs/throttler';

/**
 * 严格限流装饰器 - 适用于敏感操作如登录、支付等
 * 每分钟限制10次请求
 */
export const StrictThrottle = () =>
  Throttle({ strict: { limit: 10, ttl: 60000 } });

/**
 * 宽松限流装饰器 - 适用于一般API操作
 * 每分钟限制200次请求
 */
export const RelaxedThrottle = () =>
  Throttle({ default: { limit: 200, ttl: 60000 } });

/**
 * 超严格限流装饰器 - 适用于验证码、密码重置等
 * 每分钟限制3次请求
 */
export const SuperStrictThrottle = () =>
  Throttle({ strict: { limit: 3, ttl: 60000 } });
