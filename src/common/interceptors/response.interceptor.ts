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

    return next.handle().pipe(
      map(
        (data: T): ApiResponse<T> => ({
          // 添加类型注解
          success: true,
          data,
          message: '操作成功',
          timestamp: new Date().toISOString(),
        }),
      ),
    );
  }

  private shouldSkip(url: string): boolean {
    const skipPaths = ['/health', '/api-json', '/api'];
    return skipPaths.some((path) => url.includes(path));
  }
}
