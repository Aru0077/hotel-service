import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

// ============ 通用响应DTOs ============
export class LoginResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '用户角色', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: '用户UUID' })
  uuid: string;
}

export class UserInfoDto {
  @ApiProperty({ description: '用户UUID' })
  uuid: string;

  @ApiProperty({ description: '用户角色', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: '用户状态' })
  status: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '最后更新时间' })
  updatedAt: Date;
}

// ============ 普通用户相关DTOs ============
export class ClientRegisterDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

export class ClientLoginDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  password: string;
}

export class FacebookLoginDto {
  @ApiProperty({ description: 'Facebook访问令牌' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: '全名', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;
}

// ============ 商家用户相关DTOs ============
export class BusinessRegisterDto {
  @ApiProperty({ description: '手机号码', example: '+8613800138000' })
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({ description: '短信验证码', example: '123456' })
  @IsString()
  @MinLength(4, { message: '验证码至少4个字符' })
  verificationCode: string;
}

export class BusinessLoginDto {
  @ApiProperty({ description: '手机号码', example: '+8613800138000' })
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({ description: '短信验证码', example: '123456' })
  @IsString()
  verificationCode: string;
}

export class BusinessSetPasswordDto {
  @ApiProperty({ description: '新密码', example: '123456' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}

export class BusinessPasswordLoginDto {
  @ApiProperty({ description: '手机号码', example: '+8613800138000' })
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  password: string;
}

// ============ 管理员相关DTOs ============
export class AdminLoginDto {
  @ApiProperty({ description: '管理员用户名', example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: 'admin123' })
  @IsString()
  password: string;
}

export class AdminCreateDto {
  @ApiProperty({ description: '管理员用户名' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;

  @ApiProperty({ description: '所属部门', required: false })
  @IsOptional()
  @IsString()
  department?: string;
}

// ============ 验证码相关DTOs ============
export class SendSmsCodeDto {
  @ApiProperty({ description: '手机号码', example: '+8613800138000' })
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  refreshToken: string;
}
