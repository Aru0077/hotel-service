import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('系统监控')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '系统健康检查' })
  @ApiResponse({
    status: 200,
    description: '健康检查结果',
    type: HealthResponseDto,
  })
  async getHealthStatus(): Promise<HealthResponseDto> {
    const [databaseHealth, redisHealth] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis(),
    ]);

    const allServicesHealthy = databaseHealth && redisHealth;

    return {
      status: allServicesHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        redis: redisHealth,
      },
      uptime: process.uptime(),
    };
  }

  @Get('database')
  @ApiOperation({ summary: '数据库健康检查' })
  async getDatabaseHealth(): Promise<{ status: boolean; timestamp: string }> {
    const status = await this.healthService.checkDatabase();
    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis健康检查' })
  async getRedisHealth(): Promise<{ status: boolean; timestamp: string }> {
    const status = await this.healthService.checkRedis();
    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
