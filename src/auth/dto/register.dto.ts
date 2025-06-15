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
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class RegisterMerchantDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class RegisterAdminDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '手机号' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @ApiProperty({ description: '邮箱' })
  @IsEmail()
  email: string;
}
