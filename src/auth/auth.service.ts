// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  RegisterUserDto,
  RegisterMerchantDto,
  RegisterAdminDto,
} from './dto/register.dto';
import type {
  AuthResponse,
  JwtPayload,
  AuthenticatedUser,
} from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(registerDto: RegisterUserDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.USER,
    });
    return this.generateTokenResponse(user);
  }

  async registerMerchant(
    registerDto: RegisterMerchantDto,
  ): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.MERCHANT,
    });
    return this.generateTokenResponse(user);
  }

  async registerAdmin(registerDto: RegisterAdminDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.ADMIN,
    });
    return this.generateTokenResponse(user);
  }

  async signIn(username: string, password: string): Promise<AuthResponse> {
    const user = await this.usersService.findOne(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户状态异常');
    }

    await this.usersService.updateLastLogin(user.id);
    return this.generateTokenResponse(user);
  }

  private generateTokenResponse(user: User): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: authenticatedUser,
    };
  }
}
