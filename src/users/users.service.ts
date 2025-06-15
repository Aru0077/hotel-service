import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { User, UserWithPassword } from '../auth/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByIdentifier(identifier: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
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
  }

  async checkUserExists(
    username: string,
    email: string,
    phone?: string,
  ): Promise<boolean> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }, ...(phone ? [{ phone }] : [])],
      },
      select: { id: true },
    });
    return !!existingUser;
  }

  async createUser(userData: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    role: UserRole;
    status?: UserStatus;
  }): Promise<User> {
    return this.prisma.user.create({
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
