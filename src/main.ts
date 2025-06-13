import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { setupSwagger } from './swagger/swagger.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      timestamp: true,
    }),
    // 生产环境禁用详细日志
    bufferLogs: process.env.NODE_ENV === 'production',
  });

  const configService = app.get(ConfigService);

  // 性能优化：仅在开发环境启用详细验证
  const isDevelopment = configService.app.environment === 'development';

  // 全局前缀
  app.setGlobalPrefix(configService.app.globalPrefix);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: !isDevelopment,
      // 性能优化：减少验证开销
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // CORS配置优化
  if (isDevelopment) {
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    // 生产环境严格控制CORS
    app.enableCors({
      origin: false,
      credentials: false,
    });
  }

  // 仅开发和测试环境启用Swagger
  if (isDevelopment || configService.app.environment === 'test') {
    setupSwagger(app);
  }

  await app.listen(configService.app.port);

  const logger = new ConsoleLogger('Bootstrap');
  logger.log(
    JSON.stringify(
      {
        message: '应用启动成功',
        port: configService.app.port,
        environment: configService.app.environment,
        apiPrefix: configService.app.globalPrefix,
        swaggerUrl: isDevelopment
          ? `http://localhost:${configService.app.port}/api`
          : null,
        healthCheck: `http://localhost:${configService.app.port}/${configService.app.globalPrefix}/health`,
      },
      null,
      isDevelopment ? 2 : 0,
    ),
  );
}

void bootstrap();
