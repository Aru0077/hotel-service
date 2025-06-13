// 10. 性能监控拦截器 - src/common/interceptors/performance.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PERFORMANCE_KEY } from '../../decorators/performance.decorator';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const threshold = this.reflector.get<number>(
      PERFORMANCE_KEY,
      context.getHandler(),
    );

    if (!threshold) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        if (duration > threshold) {
          this.logger.warn(
            `慢请求检测: ${method} ${url} 耗时 ${duration}ms (阈值: ${threshold}ms)`,
          );
        }
      }),
    );
  }
}
