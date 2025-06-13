// 2. 优化的响应转换拦截器 - src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();

    // 跳过健康检查端点以提升性能
    if (this.isHealthCheckPath(request.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: '操作成功',
        timestamp: new Date().toISOString(),
      })),
    );
  }

  private isHealthCheckPath(url: string): boolean {
    return (
      url.includes('/health') ||
      url.includes('/api-json') ||
      url.includes('/api')
    );
  }
}
