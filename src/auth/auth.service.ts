// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UserService } from './services/user.service';
import { ClientService } from './services/client.service';
import { BusinessService } from './services/business.service';
import { AdminService } from './services/admin.service';
import { User, UserRole } from '@prisma/client';
import {
  LoginResponseDto,
  ClientRegisterDto,
  ClientLoginDto,
  FacebookLoginDto,
  BusinessRegisterDto,
  BusinessLoginDto,
  BusinessSetPasswordDto,
  BusinessPasswordLoginDto,
  AdminLoginDto,
  AdminCreateDto,
  RefreshTokenDto,
  SendSmsCodeDto,
} from './dto/auth.dto';

export interface JwtPayload {
  sub: string; // 用户UUID
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7天
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly clientService: ClientService,
    private readonly businessService: BusinessService,
    private readonly adminService: AdminService,
  ) {}

  // ============ 普通用户认证方法 ============

  /**
   * 普通用户注册
   */
  async clientRegister(dto: ClientRegisterDto): Promise<LoginResponseDto> {
    const user = await this.clientService.registerWithPassword(dto);
    return await this.generateTokenResponse(user);
  }

  /**
   * 普通用户登录
   */
  async clientLogin(dto: ClientLoginDto): Promise<LoginResponseDto> {
    const { username, password } = dto;
    const user = await this.userService.validatePassword(
      'PASSWORD',
      username,
      password,
    );

    if (!user || user.role !== UserRole.CLIENT) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return await this.generateTokenResponse(user);
  }

  /**
   * Facebook登录
   */
  async facebookLogin(dto: FacebookLoginDto): Promise<LoginResponseDto> {
    const user = await this.clientService.loginWithFacebook(dto);
    return await this.generateTokenResponse(user);
  }

  // ============ 商家用户认证方法 ============

  /**
   * 发送短信验证码
   */
  async sendSmsCode(dto: SendSmsCodeDto): Promise<{ message: string }> {
    await this.businessService.sendSmsCode(dto.phone);
    return { message: '验证码发送成功' };
  }

  /**
   * 商家用户注册
   */
  async businessRegister(dto: BusinessRegisterDto): Promise<LoginResponseDto> {
    const user = await this.businessService.registerBusiness(dto);
    return await this.generateTokenResponse(user);
  }

  /**
   * 商家验证码登录
   */
  async businessSmsLogin(dto: BusinessLoginDto): Promise<LoginResponseDto> {
    const user = await this.businessService.loginWithSmsCode(dto);
    return await this.generateTokenResponse(user);
  }

  /**
   * 商家设置密码
   */
  async businessSetPassword(
    userId: number,
    dto: BusinessSetPasswordDto,
  ): Promise<{ message: string }> {
    await this.businessService.setPassword(userId, dto);
    return { message: '密码设置成功' };
  }

  /**
   * 商家密码登录
   */
  async businessPasswordLogin(
    dto: BusinessPasswordLoginDto,
  ): Promise<LoginResponseDto> {
    const { phone, password } = dto;
    const user = await this.businessService.loginWithPassword(phone, password);
    return await this.generateTokenResponse(user);
  }

  // ============ 管理员认证方法 ============

  /**
   * 管理员登录
   */
  async adminLogin(dto: AdminLoginDto): Promise<LoginResponseDto> {
    const { username, password } = dto;
    const user = await this.adminService.loginAdmin(username, password);

    // 更新最后登录时间
    await this.adminService.updateLastLoginTime(user.id);

    return await this.generateTokenResponse(user);
  }

  /**
   * 创建管理员（仅超级管理员可操作）
   */
  async createAdmin(
    operatorUserId: number,
    dto: AdminCreateDto,
  ): Promise<{ message: string; adminUuid: string }> {
    const newAdmin = await this.adminService.createAdmin(operatorUserId, dto);
    return {
      message: '管理员创建成功',
      adminUuid: newAdmin.uuid,
    };
  }

  // ============ 通用认证方法 ============

  /**
   * 刷新令牌
   */
  async refreshToken(dto: RefreshTokenDto): Promise<LoginResponseDto> {
    const { refreshToken } = dto;

    // 验证刷新令牌
    const userUuid = await this.validateRefreshToken(refreshToken);
    if (!userUuid) {
      throw new UnauthorizedException('无效的刷新令牌');
    }

    // 获取用户信息
    const user = await this.userService.findUserByUuid(userUuid);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 删除旧的刷新令牌
    await this.revokeRefreshToken(refreshToken);

    // 生成新的令牌对
    return await this.generateTokenResponse(user);
  }

  /**
   * 登出
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }
    return { message: '登出成功' };
  }

  /**
   * 验证访问令牌
   */
  async validateAccessToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.userService.findUserByUuid(payload.sub);

      // 检查用户状态
      if (user && user.status !== 'ACTIVE') {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取用户信息
   */
  async getCurrentUser(userUuid: string) {
    const user = await this.userService.findUserByUuid(userUuid);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 根据角色返回不同的用户信息
    switch (user.role) {
      case UserRole.CLIENT:
        return await this.clientService.getClientProfile(user.id);
      case UserRole.BUSINESS:
        return await this.businessService.getBusinessAuthMethods(user.id);
      case UserRole.ADMIN:
        return await this.adminService.getAdminProfile(user.id);
      default:
        return {
          uuid: user.uuid,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
    }
  }

  // ============ 私有辅助方法 ============

  /**
   * 生成令牌响应
   */
  private async generateTokenResponse(user: User): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.uuid,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.uuid);

    return {
      accessToken,
      refreshToken,
      role: user.role,
      uuid: user.uuid,
    };
  }

  /**
   * 生成刷新令牌
   */
  private async generateRefreshToken(userUuid: string): Promise<string> {
    const refreshToken = this.generateRandomToken();
    const cacheKey = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;

    await this.redisService.set(cacheKey, userUuid, this.REFRESH_TOKEN_TTL);

    return refreshToken;
  }

  /**
   * 验证刷新令牌
   */
  private async validateRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    const cacheKey = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    return await this.redisService.get<string>(cacheKey);
  }

  /**
   * 撤销刷新令牌
   */
  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const cacheKey = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    await this.redisService.del(cacheKey);
  }

  /**
   * 生成随机令牌
   */
  private generateRandomToken(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查验证码状态（前端使用）
   */
  async checkSmsCodeStatus(
    phone: string,
  ): Promise<{ exists: boolean; ttl?: number }> {
    return await this.businessService.checkSmsCodeExists(phone);
  }
}
