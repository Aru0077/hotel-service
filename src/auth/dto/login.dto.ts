// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

// 用户名+密码 登录
export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(1, { message: '用户名不能为空' })
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}

// 手机号码+验证码 登录
export class SmsLoginDto {
  @ApiProperty({ description: '手机号' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码' })
  @IsString({ message: '验证码必须是字符串' })
  @MinLength(4, { message: '验证码不能少于4位' })
  code: string;
}

// 普通用户 facebook 登录
export class FacebookLoginDto {
  @ApiProperty({ description: 'Facebook访问令牌' })
  @IsString({ message: 'Facebook令牌必须是字符串' })
  @MinLength(1, { message: 'Facebook令牌不能为空' })
  accessToken: string;
}

// 商家绑定手机号码
export class BindPhoneDto {
  @ApiProperty({ description: '手机号' })
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '验证码' })
  @IsString({ message: '验证码必须是字符串' })
  @MinLength(4, { message: '验证码不能少于4位' })
  code: string;
}
