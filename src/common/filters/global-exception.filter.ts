// ===============================
// 2. 精简版全局异常过滤器
// src/common/filters/global-exception.filter.ts
// ===============================
import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApiResponse } from '../interfaces/response.interface';

interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let error = 'InternalServerError';

    // 处理 HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const httpResponse = exceptionResponse as HttpExceptionResponse;
        message = Array.isArray(httpResponse.message)
          ? httpResponse.message.join(', ')
          : (httpResponse.message ?? '请求处理失败');
      }
      error = exception.name;
    }
    // 处理 Prisma 异常
    else if (exception instanceof PrismaClientKnownRequestError) {
      const {
        status: prismaStatus,
        message: prismaMessage,
        error: prismaError,
      } = this.handlePrismaError(exception);
      status = prismaStatus;
      message = prismaMessage;
      error = prismaError;
    }

    // 记录错误（仅记录非预期错误）
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('系统异常', {
        error: exception instanceof Error ? exception.message : exception,
        stack: exception instanceof Error ? exception.stack : undefined,
        url: request.url,
        method: request.method,
      });
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      error,
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(exception: PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
    error: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: '数据已存在，请检查是否重复提交',
          error: 'CONFLICT',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: '请求的记录不存在',
          error: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: '数据关联约束冲突',
          error: 'VALIDATION_ERROR',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '数据库操作失败',
          error: 'DATABASE_ERROR',
        };
    }
  }
}
