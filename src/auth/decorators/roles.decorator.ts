// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * 角色权限装饰器
 * 用于标记控制器方法所需的用户角色权限
 *
 * @param roles 允许访问的用户角色数组
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @UseGuards(AuthGuard, RoleGuard)
 * async adminOnlyMethod() {
 *   // 只有管理员可以访问的方法
 * }
 *
 * @Roles(UserRole.BUSINESS, UserRole.ADMIN)
 * @UseGuards(AuthGuard, RoleGuard)
 * async businessOrAdminMethod() {
 *   // 商家或管理员可以访问的方法
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
