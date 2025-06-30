// src/auth/guards/role.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由所需的角色权限
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置角色要求，允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 检查用户是否已通过认证守卫
    if (!user) {
      this.logger.warn('用户信息缺失，可能是认证守卫未执行');
      throw new ForbiddenException('用户认证信息缺失');
    }

    // 检查用户角色是否满足要求
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      this.logger.warn(
        `用户角色权限不足: 需要 ${requiredRoles.join('/')}, 当前 ${user.role}`,
      );
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
