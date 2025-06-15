// src/auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UserInfoDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '用户角色', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: '用户状态', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: '邮箱', required: false })
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT访问令牌' })
  access_token: string;

  @ApiProperty({ description: '刷新令牌' })
  refresh_token: string;

  @ApiProperty({ description: '用户信息', type: UserInfoDto })
  user: UserInfoDto;
}
