// 3. 修复的异常过滤器 - src/common/filters/all-exceptions.filter.ts
import {
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 记录异常信息
    this.logger.error('未处理异常', {
      error: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // 如果是HttpException，让父类处理但返回统一格式
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any)?.message || '请求处理失败';

      const errorResponse: ApiResponse = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        error: exception.name,
        statusCode: status,
      };

      response.status(status).json(errorResponse);
      return;
    }

    // 处理其他未知异常
    const errorResponse: ApiResponse = {
      success: false,
      message: '服务器内部错误',
      timestamp: new Date().toISOString(),
      error: 'InternalServerError',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}
