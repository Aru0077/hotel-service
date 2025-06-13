// 4. 优化的Prisma异常过滤器 - src/common/filters/prisma-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApiResponse } from '../interfaces/response.interface';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.getHttpStatus(exception.code);
    const message = this.getMessage(exception.code);

    this.logger.error(`Prisma异常: ${exception.code}`, {
      code: exception.code,
      message: exception.message,
      meta: exception.meta,
    });

    const errorResponse: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      error: this.getErrorType(exception.code),
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }

  private getHttpStatus(code: string): HttpStatus {
    const statusMap: Record<string, HttpStatus> = {
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
      P2001: HttpStatus.NOT_FOUND,
      P2015: HttpStatus.NOT_FOUND,
      P2018: HttpStatus.NOT_FOUND,
      P2003: HttpStatus.BAD_REQUEST,
      P2004: HttpStatus.BAD_REQUEST,
      P2024: HttpStatus.SERVICE_UNAVAILABLE,
    };

    return statusMap[code] || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(code: string): string {
    const messageMap: Record<string, string> = {
      P2002: '数据已存在，请检查是否重复提交',
      P2025: '请求的记录不存在',
      P2001: '查询结果为空',
      P2015: '相关记录未找到',
      P2018: '所需的关联记录不存在',
      P2003: '数据关联约束冲突，请检查相关数据',
      P2004: '数据库约束验证失败',
      P2024: '服务繁忙，请稍后重试',
    };

    return messageMap[code] || '数据库操作失败';
  }

  private getErrorType(code: string): string {
    const typeMap: Record<string, string> = {
      P2002: 'CONFLICT',
      P2025: 'NOT_FOUND',
      P2001: 'NOT_FOUND',
      P2003: 'VALIDATION_ERROR',
      P2024: 'SERVICE_UNAVAILABLE',
    };

    return typeMap[code] || 'DATABASE_ERROR';
  }
}
