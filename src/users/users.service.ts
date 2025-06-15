// # 4. 用户服务（数据层）
// # src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { User } from '../auth/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    role: UserRole;
    status?: UserStatus;
  }): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        status: userData.status ?? UserStatus.ACTIVE,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return user;
  }

  async createUserWithProfile(userData: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    role: UserRole;
    status?: UserStatus;
    nickname?: string;
  }): Promise<User> {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: userData.username,
          password: userData.password,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          status: userData.status ?? UserStatus.ACTIVE,
        },
      });

      if (userData.role === UserRole.USER) {
        await tx.userProfile.create({
          data: {
            userId: user.id,
            nickname: userData.nickname ?? userData.username,
          },
        });
      }

      return user;
    });

    return {
      id: result.id,
      username: result.username,
      email: result.email,
      phone: result.phone,
      role: result.role,
      status: result.status,
    };
  }
}
