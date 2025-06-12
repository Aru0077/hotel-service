import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
  };
  uptime: number;
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealthStatus(): Promise<HealthCheckResult> {
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
  async getDatabaseHealth(): Promise<{ status: boolean; timestamp: string }> {
    const status = await this.healthService.checkDatabase();
    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('redis')
  async getRedisHealth(): Promise<{ status: boolean; timestamp: string }> {
    const status = await this.healthService.checkRedis();
    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
