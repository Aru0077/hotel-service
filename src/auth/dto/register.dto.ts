// src/auth/dto/register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码', example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(50, { message: '密码最多50个字符' })
  password: string;

  @ApiProperty({
    description: '邮箱',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}

export class RegisterMerchantDto extends RegisterUserDto {
  @ApiProperty({ description: '商家联系手机号', example: '+1234567890' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class RegisterAdminDto extends RegisterUserDto {
  @ApiProperty({ description: '管理员手机号', example: '+1234567890' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '管理员邮箱', example: 'admin@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}
