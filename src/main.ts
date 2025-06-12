import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.listen(configService.app.port);
    console.log(`应用程序运行在端口 ${configService.app.port}`);
  } catch (error) {
    console.error('应用程序启动失败:', error);
    process.exit(1);
  }
}

void bootstrap();
