// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(1)
  password: string;
}
