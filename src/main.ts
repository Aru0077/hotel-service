import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? '3000';
  const env = configService.get<string>('NODE_ENV');

  // 全局配置
  app.setGlobalPrefix('v1');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 开发环境启用Swagger
  if (env === 'development') {
    setupSwagger(app);
  }

  await app.listen(port);
  console.log(`Application running on port ${port} in ${env} mode`);
}

void bootstrap();
