// src/common/filters/prisma-exception.filter.ts (可选)
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = this.getHttpStatus(exception.code);
    const message = this.getMessage(exception.code);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private getHttpStatus(code: string): HttpStatus {
    switch (code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      case 'P2003':
      case 'P2014':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getMessage(code: string): string {
    switch (code) {
      case 'P2002':
        return 'Unique constraint violation';
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Foreign key constraint violation';
      case 'P2014':
        return 'Invalid ID provided';
      default:
        return 'Database error occurred';
    }
  }
}
