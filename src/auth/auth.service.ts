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
import { BaseRegisterDto } from './dto/register.dto';
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

  async registerUser(registerDto: BaseRegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.USER,
    });
    return this.generateTokenResponse(user);
  }

  async registerMerchant(registerDto: BaseRegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.MERCHANT,
    });
    return this.generateTokenResponse(user);
  }

  async registerAdmin(registerDto: BaseRegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.ADMIN,
    });
    return this.generateTokenResponse(user);
  }

  async signIn(
    usernameOrPhone: string,
    password: string,
  ): Promise<AuthResponse> {
    const user = await this.usersService.findByUsernameOrPhone(usernameOrPhone);
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

  async smsLogin(phone: string, code: string): Promise<AuthResponse> {
    // 验证验证码
    const isCodeValid = await this.validateSmsCode(phone, code);
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码无效或已过期');
    }

    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new UnauthorizedException('手机号未注册');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户状态异常');
    }

    // 撤销用户的所有现有刷新令牌
    await this.revokeAllUserTokens(user.id);

    await this.usersService.updateLastLogin(user.id);
    return this.generateTokenResponse(user);
  }

  async facebookLogin(_accessToken: string): Promise<AuthResponse> {
    // TODO: 实现Facebook登录逻辑
    // 1. 验证Facebook accessToken
    // 2. 获取Facebook用户信息
    // 3. 查找或创建用户
    throw new Error('Facebook登录功能暂未实现');
  }

  async bindPhone(userId: string, phone: string, code: string): Promise<void> {
    // 验证验证码
    const isCodeValid = await this.validateBindCode(userId, phone, code);
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码无效或已过期');
    }

    // 检查手机号是否已被其他用户使用
    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      throw new ForbiddenException('手机号已被其他用户使用');
    }

    // 更新用户手机号
    await this.usersService.updatePhone(userId, phone);
  }

  async generateBindCode(userId: string, phone: string): Promise<string> {
    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码到数据库，有效期10分钟
    await this.prisma.verificationCode.create({
      data: {
        identifier: `${userId}_${phone}`,
        code,
        type: 'SMS',
        purpose: 'PHONE_BINDING',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟
      },
    });

    // 生产环境安全处理
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      return code; // 仅开发环境返回验证码
    }

    // TODO: 集成短信服务发送验证码到手机
    return '验证码已发送至您的手机';
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

  private async validateSmsCode(phone: string, code: string): Promise<boolean> {
    const verificationRecord = await this.prisma.verificationCode.findFirst({
      where: {
        identifier: phone,
        code,
        type: 'SMS',
        purpose: 'LOGIN',
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationRecord) {
      return false;
    }

    // 标记验证码为已使用
    await this.prisma.verificationCode.update({
      where: { id: verificationRecord.id },
      data: { isUsed: true },
    });

    return true;
  }

  private async validateBindCode(
    userId: string,
    phone: string,
    code: string,
  ): Promise<boolean> {
    const verificationRecord = await this.prisma.verificationCode.findFirst({
      where: {
        identifier: `${userId}_${phone}`,
        code,
        type: 'SMS',
        purpose: 'PHONE_BINDING',
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!verificationRecord) {
      return false;
    }

    // 标记验证码为已使用
    await this.prisma.verificationCode.update({
      where: { id: verificationRecord.id },
      data: { isUsed: true },
    });

    return true;
  }
}
