import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString({ message: '刷新令牌必须是字符串' })
  refreshToken: string;
}
