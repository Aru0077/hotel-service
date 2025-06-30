// src/auth/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('访问令牌缺失');
      throw new UnauthorizedException('访问令牌缺失');
    }

    try {
      const user = await this.authService.validateAccessToken(token);

      if (!user) {
        this.logger.warn('无效的访问令牌');
        throw new UnauthorizedException('访问令牌无效');
      }

      if (user.status !== 'ACTIVE') {
        this.logger.warn(`用户账户状态异常: ${user.status}`);
        throw new UnauthorizedException('账户已被禁用');
      }

      // 将用户信息附加到请求对象
      (request as any).user = {
        uuid: user.uuid,
        userId: user.id,
        role: user.role,
        status: user.status,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('令牌验证失败', error);
      throw new UnauthorizedException('令牌验证失败');
    }
  }

  /**
   * 从请求头中提取Bearer令牌
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }
}
