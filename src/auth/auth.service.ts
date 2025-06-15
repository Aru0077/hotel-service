// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
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
  RefreshResponse,
} from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户状态异常');
    }

    // 撤销用户的所有现有刷新令牌（实现单设备登录）
    await this.revokeAllUserTokens(user.id);

    await this.usersService.updateLastLogin(user.id);
    return this.generateTokenResponse(user);
  }

  async refreshToken(refreshTokenString: string): Promise<RefreshResponse> {
    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { user: true },
    });

    if (!refreshTokenRecord || refreshTokenRecord.isRevoked) {
      throw new UnauthorizedException('刷新令牌无效');
    }

    if (refreshTokenRecord.expiresAt < new Date()) {
      await this.revokeRefreshToken(refreshTokenString);
      throw new UnauthorizedException('刷新令牌已过期');
    }

    const user = refreshTokenRecord.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('账户状态异常');
    }

    // 撤销当前刷新令牌
    await this.revokeRefreshToken(refreshTokenString);

    // 生成新的令牌对
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken.token,
    };
  }

  async logout(refreshTokenString: string): Promise<void> {
    await this.revokeRefreshToken(refreshTokenString);
  }

  private async generateTokenResponse(user: User): Promise<AuthResponse> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
    };

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      user: authenticatedUser,
    };
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(user: User) {
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const payload = { sub: user.id, type: 'refresh' };
    const token = this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天过期

    return this.prisma.refreshToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });
  }

  private async revokeRefreshToken(refreshTokenString: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshTokenString },
      data: { isRevoked: true },
    });
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });
  }
}
