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
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(20, { message: '用户名长度不能超过20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  password: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}

export class RegisterMerchantDto {
  @ApiProperty({ description: '用户名' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(20, { message: '用户名长度不能超过20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  password: string;

  @ApiProperty({ description: '手机号' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;
}

export class RegisterAdminDto {
  @ApiProperty({ description: '用户名' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(3, { message: '用户名长度不能少于3个字符' })
  @MaxLength(20, { message: '用户名长度不能超过20个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  password: string;

  @ApiProperty({ description: '手机号' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '邮箱' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}
