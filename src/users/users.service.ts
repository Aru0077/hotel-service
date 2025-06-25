// src/users/users.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserData {
  username: string;
  password: string;
  phone?: string;
  email?: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建用户
  async create(userData: CreateUserData): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      // 检查用户名是否存在
      const existingUser = await tx.user.findUnique({
        where: { username: userData.username },
      });
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }

      // 检查手机号（如果提供）
      if (userData.phone) {
        const existingPhone = await this.prisma.user.findUnique({
          where: { phone: userData.phone },
        });
        if (existingPhone) {
          throw new ConflictException('手机号已存在');
        }
      }

      // 检查邮箱（如果提供）
      if (userData.email) {
        const existingEmail = await this.prisma.user.findUnique({
          where: { email: userData.email },
        });
        if (existingEmail) {
          throw new ConflictException('邮箱已存在');
        }
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // 创建用户
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });

      // 为普通用户创建档案
      if (userData.role === UserRole.USER) {
        await this.prisma.userProfile.create({
          data: { userId: user.id },
        });
      }

      return user;
    });
  }

  // 用户名查找
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  // 手机查找
  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  // 手机或用户名查找
  async findByUsernameOrPhone(usernameOrPhone: string): Promise<User | null> {
    // 同时尝试用户名和手机号查找，优先用户名
    const userByUsername = await this.prisma.user.findUnique({
      where: { username: usernameOrPhone },
    });

    if (userByUsername) {
      return userByUsername;
    }

    // 如果按用户名找不到，且输入像手机号，则尝试手机号查找
    const isPhone =
      /^\+?[1-9]\d{8,14}$/.test(usernameOrPhone) &&
      usernameOrPhone.length >= 10;
    if (isPhone) {
      return this.findByPhone(usernameOrPhone);
    }

    return null;
  }

  // 更新手机
  async updatePhone(userId: string, phone: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone,
        phoneVerified: true,
      },
    });
  }

  // 更新最近一次登录
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
