// 7. 业务DTO示例 - src/health/dto/health-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ description: '服务状态', enum: ['healthy', 'unhealthy'] })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({ description: '检查时间' })
  timestamp: string;

  @ApiProperty({
    description: '服务详情',
    example: { database: true, redis: true },
  })
  services: {
    database: boolean;
    redis: boolean;
  };

  @ApiProperty({ description: '运行时间（秒）' })
  uptime: number;
}
