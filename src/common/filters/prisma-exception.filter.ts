// src/common/filters/prisma-exception.filter.ts
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
      error: this.getErrorType(exception.code),
      timestamp: new Date().toISOString(),
      code: exception.code,
    });
  }

  private getHttpStatus(code: string): HttpStatus {
    switch (code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
      case 'P2001':
      case 'P2015':
      case 'P2018':
        return HttpStatus.NOT_FOUND;
      case 'P2003':
      case 'P2004':
      case 'P2005':
      case 'P2006':
      case 'P2007':
      case 'P2011':
      case 'P2012':
      case 'P2013':
      case 'P2014':
      case 'P2019':
      case 'P2020':
        return HttpStatus.BAD_REQUEST;
      case 'P2024':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'P2008':
      case 'P2009':
      case 'P2010':
      case 'P2016':
      case 'P2017':
      case 'P2021':
      case 'P2022':
      case 'P2023':
      case 'P2026':
      case 'P2027':
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getMessage(code: string): string {
    switch (code) {
      // 冲突类错误
      case 'P2002':
        return '数据已存在，请检查是否重复提交';

      // 未找到类错误
      case 'P2025':
        return '请求的记录不存在';
      case 'P2001':
        return '查询结果为空';
      case 'P2015':
        return '相关记录未找到';
      case 'P2018':
        return '所需的关联记录不存在';

      // 数据验证类错误
      case 'P2003':
        return '数据关联约束冲突，请检查相关数据';
      case 'P2004':
        return '数据库约束验证失败';
      case 'P2005':
      case 'P2006':
        return '字段值格式不正确';
      case 'P2007':
        return '数据验证失败，请检查输入内容';
      case 'P2011':
        return '必填字段不能为空';
      case 'P2012':
        return '缺少必需的数据';
      case 'P2013':
        return '缺少必需的参数';
      case 'P2014':
        return '提供的ID格式无效';
      case 'P2019':
        return '输入数据格式错误';
      case 'P2020':
        return '数值超出允许范围';

      // 服务不可用
      case 'P2024':
        return '服务繁忙，请稍后重试';

      // 系统错误
      case 'P2008':
        return '查询语法解析失败';
      case 'P2009':
        return '查询验证失败';
      case 'P2010':
        return '原始查询执行失败';
      case 'P2016':
        return '查询解释错误';
      case 'P2017':
        return '数据表关联错误';
      case 'P2021':
        return '数据表不存在';
      case 'P2022':
        return '数据字段不存在';
      case 'P2023':
        return '数据不一致，请联系系统管理员';
      case 'P2026':
        return '当前功能暂不支持';
      case 'P2027':
        return '系统出现多个错误';

      default:
        return '系统错误，请稍后重试';
    }
  }

  private getErrorType(code: string): string {
    switch (code) {
      case 'P2002':
        return 'CONFLICT';
      case 'P2025':
      case 'P2001':
      case 'P2015':
      case 'P2018':
        return 'NOT_FOUND';
      case 'P2003':
      case 'P2004':
      case 'P2005':
      case 'P2006':
      case 'P2007':
      case 'P2011':
      case 'P2012':
      case 'P2013':
      case 'P2014':
      case 'P2019':
      case 'P2020':
        return 'VALIDATION_ERROR';
      case 'P2024':
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
