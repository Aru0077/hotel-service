// 6. 优化的健康检查控制器 - src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { SkipThrottle } from '../security/decorators/throttle.decorators';

@ApiTags('系统监控')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @SkipThrottle()
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

    return {
      status: databaseHealth && redisHealth ? 'healthy' : 'unhealthy',
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
  @ApiResponse({
    status: 200,
    description: '数据库健康状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean' },
        timestamp: { type: 'string' },
        responseTime: { type: 'number', description: '响应时间(ms)' },
      },
    },
  })
  async getDatabaseHealth() {
    const startTime = Date.now();
    const status = await this.healthService.checkDatabase();
    const responseTime = Date.now() - startTime;

    return {
      status,
      timestamp: new Date().toISOString(),
      responseTime,
    };
  }

  @Get('redis')
  @ApiOperation({ summary: 'Redis健康检查' })
  @ApiResponse({
    status: 200,
    description: 'Redis健康状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'boolean' },
        timestamp: { type: 'string' },
        responseTime: { type: 'number', description: '响应时间(ms)' },
      },
    },
  })
  async getRedisHealth() {
    const startTime = Date.now();
    const status = await this.healthService.checkRedis();
    const responseTime = Date.now() - startTime;

    return {
      status,
      timestamp: new Date().toISOString(),
      responseTime,
    };
  }

  // 新增：详细的系统状态检查
  @Get('detailed')
  @ApiOperation({ summary: '详细系统状态检查' })
  @ApiResponse({
    status: 200,
    description: '详细的系统健康状态',
  })
  async getDetailedHealthStatus() {
    const healthDetails = await this.healthService.performDetailedHealthCheck();

    return {
      status:
        healthDetails.database.healthy && healthDetails.redis.healthy
          ? 'healthy'
          : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: healthDetails,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      nodeVersion: process.version,
    };
  }
}
