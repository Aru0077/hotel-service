import { ConflictException, Injectable } from '@nestjs/common';
import { AuthType, UserRole, UserStatus, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// 定义类型
export interface CreateUserOptions {
  role: UserRole;
  status?: UserStatus;
}

export interface CreateAuthCredentialOptions {
  userId: number;
  authType: AuthType;
  identifier: string;
  credential?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  //创建新用户
  async createUser(options: CreateUserOptions) {
    const { role, status = UserStatus.ACTIVE } = options;
    return await this.prisma.user.create({
      data: {
        role,
        status,
      },
    });
  }

  //根据UUID查找用户
  async findUserByUuid(uuid: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { uuid },
    });
  }

  //   根据ID查找用户
  async findUserById(id: number): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  //   创建认证凭据
  async createAuthCredential(options: CreateAuthCredentialOptions) {
    const { userId, authType, identifier, credential } = options;

    // 检查是否已存在相同的认证方式和标识符
    const existingAuth = await this.prisma.authCredential.findUnique({
      where: {
        unique_auth_identifier: {
          authType,
          identifier,
        },
      },
    });

    if (existingAuth) {
      throw new ConflictException('该认证方式已被使用');
    }

    // 如果有密码，进行加密
    let hashedCredential: string | undefined;
    if (credential) {
      hashedCredential = await this.hashPassword(credential);
    }

    return await this.prisma.authCredential.create({
      data: {
        userId,
        authType,
        identifier,
        credential: hashedCredential,
      },
    });
  }

  /**
   * 根据认证方式查找用户
   */
  async findUserByAuth(authType: AuthType, identifier: string) {
    const authCredential = await this.prisma.authCredential.findUnique({
      where: {
        unique_auth_identifier: {
          authType,
          identifier,
        },
      },
      include: {
        user: true,
      },
    });

    return authCredential?.user || null;
  }

  /**
   * 验证密码
   */
  async validatePassword(
    authType: AuthType,
    identifier: string,
    password: string,
  ): Promise<User | null> {
    const authCredential = await this.prisma.authCredential.findUnique({
      where: {
        unique_auth_identifier: {
          authType,
          identifier,
        },
      },
      include: {
        user: true,
      },
    });

    if (!authCredential || !authCredential.credential) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      authCredential.credential,
    );
    return isPasswordValid ? authCredential.user : null;
  }

  /**
   * 更新用户认证凭据
   */
  async updateAuthCredential(
    userId: number,
    authType: AuthType,
    identifier: string,
    newCredential?: string,
  ) {
    let hashedCredential: string | undefined;
    if (newCredential) {
      hashedCredential = await this.hashPassword(newCredential);
    }

    return await this.prisma.authCredential.updateMany({
      where: {
        userId,
        authType,
        identifier,
      },
      data: {
        credential: hashedCredential,
      },
    });
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(userId: number, status: UserStatus): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  /**
   * 获取用户的所有认证方式
   */
  async getUserAuthMethods(userId: number) {
    return await this.prisma.authCredential.findMany({
      where: { userId },
      select: {
        authType: true,
        identifier: true,
        createdAt: true,
      },
    });
  }

  /**
   * 删除认证凭据
   */
  async removeAuthCredential(
    userId: number,
    authType: AuthType,
    identifier: string,
  ) {
    return await this.prisma.authCredential.deleteMany({
      where: {
        userId,
        authType,
        identifier,
      },
    });
  }

  /**
   * 检查用户是否存在
   */
  async userExists(authType: AuthType, identifier: string): Promise<boolean> {
    const user = await this.findUserByAuth(authType, identifier);
    return !!user;
  }

  /**
   * 私有方法：密码加密
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 根据角色统计用户数量
   */
  async countUsersByRole(role: UserRole): Promise<number> {
    return await this.prisma.user.count({
      where: { role },
    });
  }

  /**
   * 检查是否为超级管理员
   */
  async isSuperAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminProfile: true,
      },
    });

    return (
      user?.role === UserRole.ADMIN &&
      user?.adminProfile?.username === 'superadmin'
    );
  }
}
