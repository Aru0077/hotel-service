// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { Roles } from './decorators/roles.decorator';
import {
  StrictThrottle,
  SuperStrictThrottle,
} from '../security/decorators/throttle.decorators';
import { UserRole } from '@prisma/client';
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

interface AuthenticatedRequest extends Request {
  user: {
    uuid: string;
    userId: number;
    role: UserRole;
  };
}

@ApiTags('用户认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============ 普通用户认证接口 ============

  @Post('client/register')
  @StrictThrottle() // 注册限流：每分钟10次
  @ApiOperation({ summary: '普通用户注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async clientRegister(
    @Body() dto: ClientRegisterDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.clientRegister(dto);
  }

  @Post('client/login')
  @StrictThrottle() // 登录限流：每分钟10次
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '普通用户登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async clientLogin(@Body() dto: ClientLoginDto): Promise<LoginResponseDto> {
    return await this.authService.clientLogin(dto);
  }

  @Post('client/facebook')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Facebook登录' })
  @ApiResponse({
    status: 200,
    description: 'Facebook登录成功',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Facebook令牌验证失败' })
  async facebookLogin(
    @Body() dto: FacebookLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.facebookLogin(dto);
  }

  // ============ 商家用户认证接口 ============

  @Post('business/send-sms')
  @SuperStrictThrottle() // 发送验证码限流：每分钟3次
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送短信验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  @ApiResponse({ status: 400, description: '手机号格式错误' })
  async sendSmsCode(@Body() dto: SendSmsCodeDto): Promise<{ message: string }> {
    return await this.authService.sendSmsCode(dto);
  }

  @Get('business/sms-status')
  @ApiOperation({ summary: '检查验证码状态' })
  @ApiResponse({ status: 200, description: '验证码状态检查成功' })
  async checkSmsStatus(
    @Query('phone') phone: string,
  ): Promise<{ exists: boolean; ttl?: number }> {
    return await this.authService.checkSmsCodeStatus(phone);
  }

  @Post('business/register')
  @StrictThrottle()
  @ApiOperation({ summary: '商家用户注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: '验证码错误或已过期' })
  async businessRegister(
    @Body() dto: BusinessRegisterDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.businessRegister(dto);
  }

  @Post('business/sms-login')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '商家验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: '验证码错误或用户不存在' })
  async businessSmsLogin(
    @Body() dto: BusinessLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.businessSmsLogin(dto);
  }

  @Post('business/set-password')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.BUSINESS)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '商家设置密码' })
  @ApiResponse({ status: 200, description: '密码设置成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async businessSetPassword(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BusinessSetPasswordDto,
  ): Promise<{ message: string }> {
    return await this.authService.businessSetPassword(req.user.userId, dto);
  }

  @Post('business/password-login')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '商家密码登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  @ApiResponse({ status: 400, description: '手机号或密码错误' })
  async businessPasswordLogin(
    @Body() dto: BusinessPasswordLoginDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.businessPasswordLogin(dto);
  }

  // ============ 管理员认证接口 ============

  @Post('admin/login')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '管理员登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async adminLogin(@Body() dto: AdminLoginDto): Promise<LoginResponseDto> {
    return await this.authService.adminLogin(dto);
  }

  @Post('admin/create')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建新管理员（仅超级管理员）' })
  @ApiResponse({ status: 201, description: '管理员创建成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createAdmin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AdminCreateDto,
  ): Promise<{ message: string; adminUuid: string }> {
    return await this.authService.createAdmin(req.user.userId, dto);
  }

  // ============ 通用认证接口 ============

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({
    status: 200,
    description: '令牌刷新成功',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: '刷新令牌无效' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return await this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: '刷新令牌',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(
    @Body('refreshToken') refreshToken?: string,
  ): Promise<{ message: string }> {
    return await this.authService.logout(refreshToken || '');
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '用户信息获取成功' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  async getCurrentUser(@Request() req: AuthenticatedRequest) {
    return await this.authService.getCurrentUser(req.user.uuid);
  }

  @Get('check-auth')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查认证状态' })
  @ApiResponse({
    status: 200,
    description: '认证状态检查成功',
    schema: {
      type: 'object',
      properties: {
        authenticated: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            uuid: { type: 'string' },
            role: { type: 'string', enum: ['CLIENT', 'BUSINESS', 'ADMIN'] },
          },
        },
      },
    },
  })
  async checkAuth(@Request() req: AuthenticatedRequest) {
    return {
      authenticated: true,
      user: {
        uuid: req.user.uuid,
        role: req.user.role,
      },
    };
  }

  // ============ 测试接口（开发环境）============

  @Get('test/super-admin-info')
  @ApiOperation({ summary: '获取超级管理员信息（开发测试用）' })
  @ApiResponse({
    status: 200,
    description: '超级管理员信息',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        credentials: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
  })
  async getSuperAdminInfo() {
    return {
      message: '超级管理员默认凭据（仅开发环境显示）',
      credentials: {
        username: 'superadmin',
        password: 'admin123',
      },
      note: '生产环境请立即修改密码',
    };
  }
}
