// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  UserRegisterDto,
  MerchantRegisterDto,
  AdminRegisterDto,
  LoginDto,
  AuthResponseDto,
} from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import {
  CurrentUser,
  CurrentUserPayload,
} from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('用户认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/user')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '普通用户注册' })
  @ApiBody({ type: UserRegisterDto })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerUser(
    @Body() registerDto: UserRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerUser(registerDto);
  }

  @Post('register/merchant')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '商家用户注册' })
  @ApiBody({ type: MerchantRegisterDto })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerMerchant(
    @Body() registerDto: MerchantRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerMerchant(registerDto);
  }

  @Post('register/admin')
  @Public()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '管理员注册（仅管理员可操作）' })
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  async registerAdmin(
    @Body() registerDto: AdminRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerAdmin(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '用户信息' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员专用接口示例' })
  @ApiResponse({ status: 200, description: '管理员信息' })
  adminOnly(@CurrentUser() user: CurrentUserPayload) {
    return { message: '这是管理员专用接口', user };
  }
}
