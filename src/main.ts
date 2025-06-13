import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { setupSwagger } from './swagger/swagger.config';
import helmet from 'helmet';

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
  const isProduction = configService.app.environment === 'production';

  // 2. 基础Helmet安全头配置
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
            },
          }
        : false, // 开发环境禁用CSP避免调试问题
      crossOriginEmbedderPolicy: false,
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
          }
        : false,
    }),
  );

  // 3. CORS配置 - 支持三个客户端
  const allowedOrigins = isProduction
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : [
        'http://localhost:3000', // 管理员网站
        'http://localhost:3001', // 商家网站
        'capacitor://localhost', // 移动应用
        'ionic://localhost',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // 允许移动应用的无origin请求
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('不允许的跨域请求'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24小时预检缓存
  });

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
      // 添加性能优化选项
      enableDebugMessages: isDevelopment,
      stopAtFirstError: !isDevelopment,
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
