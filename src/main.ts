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
  });

  const configService = app.get(ConfigService);

  // 全局前缀
  app.setGlobalPrefix(configService.app.globalPrefix);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: configService.app.environment === 'production',
    }),
  );

  // CORS配置
  app.enableCors({
    origin: configService.app.environment === 'production' ? false : true,
    credentials: true,
  });

  // Swagger文档（仅非生产环境）
  if (configService.app.environment !== 'production') {
    setupSwagger(app);
  }

  await app.listen(configService.app.port);

  const logger = new ConsoleLogger('Bootstrap');
  logger.log({
    message: '应用启动成功',
    port: configService.app.port,
    environment: configService.app.environment,
    apiPrefix: configService.app.globalPrefix,
    swaggerUrl:
      configService.app.environment !== 'production'
        ? `http://localhost:${configService.app.port}/api`
        : null,
  });
}

void bootstrap();
