// src/auth/services/business.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './user.service';
import { RedisService } from '../../redis/redis.service';
import { UserRole, AuthType, User } from '@prisma/client';
import {
  BusinessRegisterDto,
  BusinessLoginDto,
  BusinessSetPasswordDto,
} from '../dto/auth.dto';

@Injectable()
export class BusinessService {
  private readonly SMS_CODE_TTL = 300; // 5分钟
  private readonly SMS_CODE_PREFIX = 'sms_code:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 发送短信验证码
   */
  async sendSmsCode(phone: string): Promise<void> {
    // 生成6位数验证码
    const code = this.generateSmsCode();
    const cacheKey = `${this.SMS_CODE_PREFIX}${phone}`;

    // 存储验证码到Redis
    await this.redisService.set(cacheKey, code, this.SMS_CODE_TTL);

    // 这里应该调用短信服务发送验证码
    // 为了演示，我们直接在控制台打印验证码
    console.log(`📱 短信验证码发送到 ${phone}: ${code}`);

    // 实际项目中应该集成短信服务提供商的API
    // await this.smsService.sendCode(phone, code);
  }

  /**
   * 商家用户注册
   */
  async registerBusiness(dto: BusinessRegisterDto): Promise<User> {
    const { phone, verificationCode } = dto;

    // 验证短信验证码
    await this.validateSmsCode(phone, verificationCode);

    // 检查手机号是否已注册
    const existingUser = await this.userService.findUserByAuth(
      AuthType.PHONE,
      phone,
    );
    if (existingUser) {
      throw new BadRequestException('该手机号已注册');
    }

    // 创建用户
    const user = await this.userService.createUser({
      role: UserRole.BUSINESS,
    });

    // 创建手机认证凭据
    await this.userService.createAuthCredential({
      userId: user.id,
      authType: AuthType.PHONE,
      identifier: phone,
    });

    // 清除已使用的验证码
    await this.clearSmsCode(phone);

    return user;
  }

  /**
   * 商家用户验证码登录
   */
  async loginWithSmsCode(dto: BusinessLoginDto): Promise<User> {
    const { phone, verificationCode } = dto;

    // 验证短信验证码
    await this.validateSmsCode(phone, verificationCode);

    // 查找用户
    const user = await this.userService.findUserByAuth(AuthType.PHONE, phone);
    if (!user || user.role !== UserRole.BUSINESS) {
      throw new NotFoundException('用户不存在或非商家用户');
    }

    // 清除已使用的验证码
    await this.clearSmsCode(phone);

    return user;
  }

  /**
   * 设置密码
   */
  async setPassword(
    userId: number,
    dto: BusinessSetPasswordDto,
  ): Promise<void> {
    const { password } = dto;

    // 获取用户的手机号
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        authCredentials: {
          where: { authType: AuthType.PHONE },
        },
      },
    });

    if (!user || user.role !== UserRole.BUSINESS) {
      throw new NotFoundException('商家用户不存在');
    }

    const phoneAuth = user.authCredentials[0];
    if (!phoneAuth) {
      throw new BadRequestException('未找到手机号认证信息');
    }

    // 创建密码认证凭据
    try {
      await this.userService.createAuthCredential({
        userId,
        authType: AuthType.PASSWORD,
        identifier: phoneAuth.identifier, // 使用手机号作为用户名
        credential: password,
      });
    } catch (error) {
      // 如果已存在密码，则更新
      await this.userService.updateAuthCredential(
        userId,
        AuthType.PASSWORD,
        phoneAuth.identifier,
        password,
      );
    }
  }

  /**
   * 密码登录
   */
  async loginWithPassword(phone: string, password: string): Promise<User> {
    // 验证密码
    const user = await this.userService.validatePassword(
      AuthType.PASSWORD,
      phone,
      password,
    );

    if (!user || user.role !== UserRole.BUSINESS) {
      throw new BadRequestException('手机号或密码错误');
    }

    return user;
  }

  /**
   * 绑定邮箱
   */
  async bindEmail(userId: number, email: string): Promise<void> {
    // 检查邮箱是否已被其他用户使用
    const existingUser = await this.userService.findUserByAuth(
      AuthType.EMAIL,
      email,
    );
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('该邮箱已被其他用户使用');
    }

    // 创建邮箱认证凭据
    try {
      await this.userService.createAuthCredential({
        userId,
        authType: AuthType.EMAIL,
        identifier: email,
      });
    } catch (error) {
      // 如果已存在，更新
      await this.userService.updateAuthCredential(
        userId,
        AuthType.EMAIL,
        email,
      );
    }
  }

  /**
   * 获取商家用户的认证方法
   */
  async getBusinessAuthMethods(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        authCredentials: {
          select: {
            authType: true,
            identifier: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || user.role !== UserRole.BUSINESS) {
      throw new NotFoundException('商家用户不存在');
    }

    return {
      userId: user.id,
      uuid: user.uuid,
      role: user.role,
      status: user.status,
      authMethods: user.authCredentials,
    };
  }

  /**
   * 验证短信验证码
   */
  private async validateSmsCode(
    phone: string,
    inputCode: string,
  ): Promise<void> {
    const cacheKey = `${this.SMS_CODE_PREFIX}${phone}`;
    const storedCode = await this.redisService.get<string>(cacheKey);

    if (!storedCode) {
      throw new BadRequestException('验证码已过期或不存在');
    }

    if (storedCode !== inputCode) {
      throw new BadRequestException('验证码错误');
    }
  }

  /**
   * 清除验证码
   */
  private async clearSmsCode(phone: string): Promise<void> {
    const cacheKey = `${this.SMS_CODE_PREFIX}${phone}`;
    await this.redisService.del(cacheKey);
  }

  /**
   * 生成6位数字验证码
   */
  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 检查验证码是否存在（用于前端显示倒计时）
   */
  async checkSmsCodeExists(
    phone: string,
  ): Promise<{ exists: boolean; ttl?: number }> {
    const cacheKey = `${this.SMS_CODE_PREFIX}${phone}`;
    const exists = await this.redisService.exists(cacheKey);

    if (exists) {
      const ttl = await this.redisService.ttl(cacheKey);
      return { exists: true, ttl: ttl > 0 ? ttl : 0 };
    }

    return { exists: false };
  }
}
