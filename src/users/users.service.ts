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

  async create(userData: CreateUserData): Promise<User> {
    // 检查用户名是否存在
    const existingUser = await this.prisma.user.findUnique({
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
        phoneVerified: userData.role !== UserRole.USER,
      },
    });

    // 为普通用户创建档案
    if (userData.role === UserRole.USER) {
      await this.prisma.userProfile.create({
        data: { userId: user.id },
      });
    }

    return user;
  }

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
