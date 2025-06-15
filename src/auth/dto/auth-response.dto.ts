// src/auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT访问令牌' })
  access_token: string;

  @ApiProperty({ description: '用户信息' })
  user: {
    id: string;
    username: string;
    role: UserRole;
    status: UserStatus;
    email?: string;
    phone?: string;
  };
}
