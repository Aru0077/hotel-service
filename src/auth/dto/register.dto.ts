import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class BaseRegisterDto {
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
}
