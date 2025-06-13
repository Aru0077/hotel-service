// 3. 全局异常过滤器 - src/common/filters/all-exceptions.filter.ts
import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 记录详细错误信息用于调试
    this.logger.error('未处理异常', {
      error: exception,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // 首先尝试使用父类处理
    try {
      super.catch(exception, host);
    } catch {
      // 如果父类无法处理，返回统一格式错误响应
      const errorResponse: ApiResponse = {
        success: false,
        message: '服务器内部错误',
        timestamp: new Date().toISOString(),
      };

      response.status(500).json(errorResponse);
    }
  }
}
