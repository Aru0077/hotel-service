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
import { LoginDto } from './dto/login.dto';
import {
  RegisterUserDto,
  RegisterMerchantDto,
  RegisterAdminDto,
} from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { StrictThrottle } from '../security/decorators/throttle.decorators';
import type { JwtPayload } from './types/auth.types';

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
    @Body() registerDto: RegisterUserDto,
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
    @Body() registerDto: RegisterMerchantDto,
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
    @Body() registerDto: RegisterAdminDto,
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
