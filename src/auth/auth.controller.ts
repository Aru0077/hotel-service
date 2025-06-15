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
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
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
import { JwtPayload } from './auth.service';
import { UserRole } from '@prisma/client';
import { StrictThrottle } from '../security/decorators/throttle.decorators';

@ApiTags('用户认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register/user')
  @StrictThrottle()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '普通用户注册' })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '用户名、邮箱或手机号已存在',
  })
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
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
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
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: AuthResponseDto,
  })
  async registerAdmin(
    @Body() registerDto: RegisterAdminDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerAdmin(registerDto);
  }

  @Public()
  @Post('login')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '用户名或密码错误',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      username: user.username,
      role: user.role,
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/test')
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员测试接口' })
  @ApiResponse({
    status: 200,
    description: '访问成功',
  })
  adminTest(@CurrentUser() user: JwtPayload) {
    return {
      message: '管理员专用接口访问成功',
      user: user,
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN)
  @Get('merchant/test')
  @ApiBearerAuth()
  @ApiOperation({ summary: '商家测试接口' })
  @ApiResponse({
    status: 200,
    description: '访问成功',
  })
  merchantTest(@CurrentUser() user: JwtPayload) {
    return {
      message: '商家接口访问成功',
      user: user,
    };
  }
}
