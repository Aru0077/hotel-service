import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma error: ${exception.code} - ${exception.message}`);

    switch (exception.code) {
      case 'P2000':
        this.handleResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Value too long for column type',
        );
        break;
      case 'P2002':
        this.handleResponse(
          response,
          HttpStatus.CONFLICT,
          'Unique constraint violation',
        );
        break;
      case 'P2014':
        this.handleResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Invalid ID provided',
        );
        break;
      case 'P2003':
        this.handleResponse(
          response,
          HttpStatus.BAD_REQUEST,
          'Foreign key constraint violation',
        );
        break;
      case 'P2025':
        this.handleResponse(response, HttpStatus.NOT_FOUND, 'Record not found');
        break;
      default:
        // Default to 500 server error
        this.handleResponse(
          response,
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Database error occurred',
        );
        break;
    }
  }

  private handleResponse(
    response: Response,
    status: HttpStatus,
    message: string,
  ) {
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

@Catch(PrismaClientValidationError)
export class PrismaClientValidationFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientValidationFilter.name);

  catch(exception: PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma validation error: ${exception.message}`);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation error in database query',
      timestamp: new Date().toISOString(),
    });
  }
}
