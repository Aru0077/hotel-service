// ===============================
// 重构后的应用启动文件
// src/main.ts
// ===============================
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { AppBootstrapConfig } from './config/app-bootstrap.config';

async function bootstrap(): Promise<void> {
  // 创建应用实例
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      json: true,
      timestamp: true,
    }),
    bufferLogs: process.env.NODE_ENV === 'production',
  });

  // 获取配置服务
  const configService = app.get(ConfigService);

  // 创建启动配置管理器
  const bootstrapConfig = new AppBootstrapConfig(app, configService);

  // 应用各项配置
  bootstrapConfig.configureHelmet();
  bootstrapConfig.configureCors();
  bootstrapConfig.setGlobalPrefix();
  bootstrapConfig.configureValidation();
  bootstrapConfig.configureSwagger();

  // 启动应用
  await app.listen(configService.app.port);

  // 输出启动信息
  const logger = new ConsoleLogger('Bootstrap');
  const startupInfo = bootstrapConfig.getStartupInfo();
  const isDevelopment = configService.app.environment === 'development';

  logger.log(JSON.stringify(startupInfo, null, isDevelopment ? 2 : 0));
}

// 启动应用并处理未捕获的异常
void bootstrap().catch((error: Error) => {
  console.error('应用启动失败:', error);
  process.exit(1);
});
