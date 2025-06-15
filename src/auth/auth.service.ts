// # 6. 认证服务
// # src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '../config/config.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  UserRegisterDto,
  MerchantRegisterDto,
  AdminRegisterDto,
  LoginDto,
  AuthResponseDto,
} from './dto';
import { AUTH_CONSTANTS } from './constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(registerDto: UserRegisterDto): Promise<AuthResponseDto> {
    await this.validateRegisterDto(registerDto);
    await this.checkUserExists(registerDto.username, registerDto.email);

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.prismaService.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: registerDto.username,
          password: hashedPassword,
          email: registerDto.email,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          nickname: registerDto.nickname || registerDto.username,
        },
      });

      return newUser;
    });

    this.logger.log(`普通用户注册成功: ${user.username}`);
    return this.generateAuthResponse(user);
  }

  async registerMerchant(
    registerDto: MerchantRegisterDto,
  ): Promise<AuthResponseDto> {
    await this.validateRegisterDto(registerDto);
    await this.checkUserExists(
      registerDto.username,
      registerDto.email,
      registerDto.phone,
    );

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.prismaService.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: registerDto.username,
          password: hashedPassword,
          email: registerDto.email,
          phone: registerDto.phone,
          role: UserRole.MERCHANT,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          nickname: registerDto.contactPerson,
        },
      });

      return newUser;
    });

    this.logger.log(`商家用户注册成功: ${user.username}`);
    return this.generateAuthResponse(user);
  }

  async registerAdmin(registerDto: AdminRegisterDto): Promise<AuthResponseDto> {
    await this.validateRegisterDto(registerDto);
    await this.checkUserExists(
      registerDto.username,
      registerDto.email,
      registerDto.phone,
    );

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.prismaService.user.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
        email: registerDto.email,
        phone: registerDto.phone,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        phoneVerified: true,
        emailVerified: true,
      },
    });

    this.logger.log(`管理员注册成功: ${user.username}`);
    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto, clientIp?: string): Promise<AuthResponseDto> {
    const { identifier, password, deviceInfo } = loginDto;

    // 检查登录尝试次数
    await this.checkLoginAttempts(identifier, clientIp);

    // 查找用户（支持用户名、邮箱、手机号登录）
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      await this.recordFailedLogin(identifier, clientIp);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.recordFailedLogin(identifier, clientIp);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查用户状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用或需要验证');
    }

    // 清除失败登录记录
    await this.clearFailedLoginAttempts(identifier, clientIp);

    // 更新最后登录时间
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成认证响应
    const authResponse = await this.generateAuthResponse(user);

    // 保存刷新令牌
    await this.saveRefreshToken(
      user.id,
      authResponse.refreshToken,
      deviceInfo,
      clientIp,
    );

    this.logger.log(`用户登录成功: ${user.username}`);
    return authResponse;
  }

  private async validateRegisterDto(dto: any): Promise<void> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('密码和确认密码不匹配');
    }
  }

  private async checkUserExists(
    username: string,
    email: string,
    phone?: string,
  ): Promise<void> {
    const existingUser = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username }, { email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已被注册');
      }
      if (phone && existingUser.phone === phone) {
        throw new ConflictException('手机号已被注册');
      }
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async generateAuthResponse(user: any): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwt.secret,
        expiresIn: this.configService.jwt.expiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwt.refreshSecret,
        expiresIn: this.configService.jwt.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        email: user.email,
        phone: user.phone,
      },
      expiresIn: this.configService.jwt.expiresIn,
    };
  }

  private async findUserByIdentifier(identifier: string) {
    return this.prismaService.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  private async checkLoginAttempts(
    identifier: string,
    clientIp?: string,
  ): Promise<void> {
    const keys = [
      `${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}${identifier}`,
      ...(clientIp
        ? [`${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}ip:${clientIp}`]
        : []),
    ];

    for (const key of keys) {
      const attempts = (await this.redisService.get<number>(key)) || 0;
      if (attempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException('登录尝试次数过多，请稍后再试');
      }
    }
  }

  private async recordFailedLogin(
    identifier: string,
    clientIp?: string,
  ): Promise<void> {
    const keys = [
      `${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}${identifier}`,
      ...(clientIp
        ? [`${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}ip:${clientIp}`]
        : []),
    ];

    await Promise.all(
      keys.map(async (key) => {
        const current = (await this.redisService.get<number>(key)) || 0;
        await this.redisService.set(
          key,
          current + 1,
          AUTH_CONSTANTS.LOGIN_ATTEMPT_WINDOW,
        );
      }),
    );
  }

  private async clearFailedLoginAttempts(
    identifier: string,
    clientIp?: string,
  ): Promise<void> {
    const keys = [
      `${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}${identifier}`,
      ...(clientIp
        ? [`${AUTH_CONSTANTS.REDIS_PREFIX.LOGIN_ATTEMPTS}ip:${clientIp}`]
        : []),
    ];

    await Promise.all(keys.map((key) => this.redisService.del(key)));
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: any,
    clientIp?: string,
  ): Promise<void> {
    const decoded = this.jwtService.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    await this.prismaService.refreshToken.create({
      data: {
        token,
        userId,
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        userAgent: deviceInfo?.userAgent,
        ipAddress: clientIp,
        platform: deviceInfo?.platform,
        expiresAt,
      },
    });

    // 同时在Redis中存储，便于快速验证
    await this.redisService.set(
      `${AUTH_CONSTANTS.REDIS_PREFIX.REFRESH_TOKEN}${token}`,
      userId,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
  }
}
