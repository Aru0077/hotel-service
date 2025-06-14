// ===============================
// 3. 精简版响应转换拦截器
// src/common/interceptors/response.interceptor.ts
// ===============================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';
import { Request } from 'express';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  private timestampCache: number = Date.now();
  private lastUpdate: number = Date.now();
  private readonly CACHE_DURATION = 1000; // 缓存1秒，减少时间戳生成频率

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // 修改后的返回类型
    const request = context.switchToHttp().getRequest<Request>(); // 添加类型注解

    // 跳过健康检查和API文档端点
    if (this.shouldSkip(request.url)) {
      // 对于跳过的路径，直接返回原始响应
      return next.handle() as Observable<ApiResponse<T>>;
    }

    // 获取缓存的时间戳
    const timestamp = this.getCachedTimestamp();

    return next.handle().pipe(
      map(
        (data: T): ApiResponse<T> => ({
          // 添加类型注解
          success: true,
          data,
          message: '操作成功',
          timestamp,
        }),
      ),
    );
  }

  private shouldSkip(url: string): boolean {
    const skipPaths = ['/health', '/api-json', '/api'];
    return skipPaths.some((path) => url.includes(path));
  }
  /**
   * 获取缓存的时间戳，减少频繁的时间戳生成
   */
  private getCachedTimestamp(): string {
    const now = Date.now();

    // 如果超过缓存时间，更新时间戳
    if (now - this.lastUpdate > this.CACHE_DURATION) {
      this.timestampCache = now;
      this.lastUpdate = now;
    }

    // 直接返回ISO字符串，避免重复转换
    return new Date(this.timestampCache).toISOString();
  }
}
