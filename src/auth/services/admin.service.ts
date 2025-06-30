// src/auth/services/admin.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './user.service';
import { UserRole, AuthType, User } from '@prisma/client';
import { AdminCreateDto } from '../dto/auth.dto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * 模块初始化时创建超级管理员
   */
  async onModuleInit() {
    await this.createSuperAdminIfNotExists();
  }

  /**
   * 管理员登录
   */
  async loginAdmin(username: string, password: string): Promise<User> {
    // 验证密码
    const user = await this.userService.validatePassword(
      AuthType.PASSWORD,
      username,
      password,
    );

    if (!user || user.role !== UserRole.ADMIN) {
      throw new BadRequestException('用户名或密码错误');
    }

    return user;
  }

  /**
   * 创建新管理员（只有超级管理员可以操作）
   */
  async createAdmin(
    operatorUserId: number,
    dto: AdminCreateDto,
  ): Promise<User> {
    const { username, password, department } = dto;

    // 验证操作者是否为超级管理员
    const isSuperAdmin = await this.userService.isSuperAdmin(operatorUserId);
    if (!isSuperAdmin) {
      throw new BadRequestException('只有超级管理员可以创建新管理员');
    }

    // 检查用户名是否已存在
    const existingUser = await this.userService.findUserByAuth(
      AuthType.PASSWORD,
      username,
    );
    if (existingUser) {
      throw new ConflictException('管理员用户名已存在');
    }

    // 创建用户
    const user = await this.userService.createUser({
      role: UserRole.ADMIN,
    });

    // 创建密码认证凭据
    await this.userService.createAuthCredential({
      userId: user.id,
      authType: AuthType.PASSWORD,
      identifier: username,
      credential: password,
    });

    // 创建管理员资料
    await this.prisma.adminProfile.create({
      data: {
        userId: user.id,
        username,
        department,
        permissions: this.getDefaultAdminPermissions(),
      },
    });

    this.logger.log(`新管理员创建成功: ${username}`);
    return user;
  }

  /**
   * 获取管理员详细信息
   */
  async getAdminProfile(userId: number) {
    const admin = await this.prisma.adminProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            uuid: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('管理员信息不存在');
    }

    return admin;
  }

  /**
   * 更新管理员权限
   */
  async updateAdminPermissions(
    operatorUserId: number,
    targetUserId: number,
    permissions: any,
  ): Promise<void> {
    // 验证操作者是否为超级管理员
    const isSuperAdmin = await this.userService.isSuperAdmin(operatorUserId);
    if (!isSuperAdmin) {
      throw new BadRequestException('只有超级管理员可以修改权限');
    }

    // 不能修改超级管理员的权限
    const targetIsSuperAdmin =
      await this.userService.isSuperAdmin(targetUserId);
    if (targetIsSuperAdmin) {
      throw new BadRequestException('不能修改超级管理员的权限');
    }

    await this.prisma.adminProfile.update({
      where: { userId: targetUserId },
      data: { permissions },
    });

    this.logger.log(`管理员权限更新成功: 用户ID ${targetUserId}`);
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLoginTime(userId: number): Promise<void> {
    await this.prisma.adminProfile.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 获取所有管理员列表（仅超级管理员可查看）
   */
  async getAllAdmins(operatorUserId: number) {
    // 验证操作者是否为超级管理员
    const isSuperAdmin = await this.userService.isSuperAdmin(operatorUserId);
    if (!isSuperAdmin) {
      throw new BadRequestException('只有超级管理员可以查看管理员列表');
    }

    return await this.prisma.adminProfile.findMany({
      include: {
        user: {
          select: {
            uuid: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 禁用/启用管理员账户
   */
  async toggleAdminStatus(
    operatorUserId: number,
    targetUserId: number,
  ): Promise<void> {
    // 验证操作者是否为超级管理员
    const isSuperAdmin = await this.userService.isSuperAdmin(operatorUserId);
    if (!isSuperAdmin) {
      throw new BadRequestException('只有超级管理员可以管理账户状态');
    }

    // 不能禁用超级管理员账户
    const targetIsSuperAdmin =
      await this.userService.isSuperAdmin(targetUserId);
    if (targetIsSuperAdmin) {
      throw new BadRequestException('不能禁用超级管理员账户');
    }

    const user = await this.userService.findUserById(targetUserId);
    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('管理员用户不存在');
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await this.userService.updateUserStatus(targetUserId, newStatus as any);

    this.logger.log(
      `管理员账户状态更新: 用户ID ${targetUserId}, 新状态: ${newStatus}`,
    );
  }

  /**
   * 创建超级管理员（如果不存在）
   */
  private async createSuperAdminIfNotExists(): Promise<void> {
    try {
      // 检查是否已存在超级管理员
      const existingSuperAdmin = await this.prisma.adminProfile.findFirst({
        where: { username: 'superadmin' },
      });

      if (existingSuperAdmin) {
        this.logger.log('超级管理员已存在');
        return;
      }

      // 创建超级管理员用户
      const superAdminUser = await this.userService.createUser({
        role: UserRole.ADMIN,
      });

      // 创建认证凭据，默认密码为 'admin123'
      await this.userService.createAuthCredential({
        userId: superAdminUser.id,
        authType: AuthType.PASSWORD,
        identifier: 'superadmin',
        credential: '240414',
      });

      // 创建超级管理员资料
      await this.prisma.adminProfile.create({
        data: {
          userId: superAdminUser.id,
          username: 'superadmin',
          department: '系统管理部',
          permissions: this.getSuperAdminPermissions(),
        },
      });

      this.logger.log('超级管理员创建成功 - 用户名: superadmin, 密码: 240414');
    } catch (error) {
      this.logger.error('创建超级管理员失败:', error);
    }
  }

  /**
   * 获取超级管理员权限配置
   */
  private getSuperAdminPermissions(): any {
    return {
      system: {
        all: true,
      },
      users: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      hotels: {
        create: true,
        read: true,
        update: true,
        delete: true,
        approve: true,
      },
      orders: {
        read: true,
        update: true,
        refund: true,
      },
    };
  }

  /**
   * 获取普通管理员默认权限配置
   */
  private getDefaultAdminPermissions(): any {
    return {
      users: {
        read: true,
        update: true,
      },
      hotels: {
        read: true,
        update: true,
        approve: true,
      },
      orders: {
        read: true,
        update: true,
      },
    };
  }
}
