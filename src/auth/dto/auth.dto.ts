import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class BaseRegisterDto {
  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ description: '确认密码', example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class UserRegisterDto extends BaseRegisterDto {
  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @ApiProperty({ description: '昵称', example: '张三', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string;
}

export class MerchantRegisterDto extends BaseRegisterDto {
  @ApiProperty({ description: '商家手机号', example: '+86-13800138000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '邮箱', example: 'merchant@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @ApiProperty({ description: '联系人姓名', example: '李四' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  contactPerson: string;
}

export class AdminRegisterDto extends BaseRegisterDto {
  @ApiProperty({ description: '管理员手机号', example: '+86-13900139000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: '邮箱', example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;
}

export class LoginDto {
  @ApiProperty({ description: '用户名、手机号或邮箱', example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.toLowerCase())
  identifier: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  access_token: string;

  @ApiProperty({ description: '用户信息' })
  user: {
    id: string;
    username: string;
    role: UserRole;
    status: string;
    email?: string;
    phone?: string;
  };
}
