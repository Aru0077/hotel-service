// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import {
  BindPhoneDto,
  FacebookLoginDto,
  LoginDto,
  SmsLoginDto,
} from './dto/login.dto';
import { BaseRegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { StrictThrottle } from '../security/decorators/throttle.decorators';
import type { JwtPayload } from './types/auth.types';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register/user')
  @StrictThrottle()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '普通用户注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerUser(
    @Body() registerDto: BaseRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerUser(registerDto);
  }

  @Public()
  @Post('register/merchant')
  @StrictThrottle()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '商家注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerMerchant(
    @Body() registerDto: BaseRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerMerchant(registerDto);
  }

  @Public()
  @Post('register/admin')
  @StrictThrottle()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '管理员注册' })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerAdmin(
    @Body() registerDto: BaseRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerAdmin(registerDto);
  }

  @Public()
  @Post('login')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  async signIn(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.signIn(loginDto.username, loginDto.password);
  }

  @Public()
  @Post('login/sms')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  async smsLogin(@Body() smsLoginDto: SmsLoginDto): Promise<AuthResponseDto> {
    return this.authService.smsLogin(smsLoginDto.phone, smsLoginDto.code);
  }

  @Public()
  @Post('login/facebook')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Facebook登录（普通用户）' })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  async facebookLogin(
    @Body() facebookLoginDto: FacebookLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.facebookLogin(facebookLoginDto.accessToken);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT)
  @Post('bind-phone')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '商家绑定手机号' })
  @ApiResponse({ status: 200, description: '绑定成功' })
  async bindPhone(
    @CurrentUser() user: JwtPayload,
    @Body() bindPhoneDto: BindPhoneDto,
  ): Promise<{ message: string }> {
    await this.authService.bindPhone(
      user.sub,
      bindPhoneDto.phone,
      bindPhoneDto.code,
    );
    return { message: '手机号绑定成功' };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT)
  @Post('generate-bind-code')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成绑定手机号验证码' })
  @ApiResponse({ status: 200, description: '验证码生成成功' })
  async generateBindCode(
    @CurrentUser() user: JwtPayload,
    @Body() body: { phone: string },
  ): Promise<{ message: string; code: string }> {
    const code = await this.authService.generateBindCode(user.sub, body.phone);
    return { message: '验证码生成成功', code };
  }

  @Public()
  @Post('refresh')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: '登出成功' };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getProfile(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/test')
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员测试接口' })
  adminTest(@CurrentUser() user: JwtPayload): {
    message: string;
    user: JwtPayload;
  } {
    return { message: '管理员接口', user };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @Get('merchant/test')
  @ApiBearerAuth()
  @ApiOperation({ summary: '商家测试接口' })
  merchantTest(@CurrentUser() user: JwtPayload): {
    message: string;
    user: JwtPayload;
  } {
    return { message: '商家接口', user };
  }
}
