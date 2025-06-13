// ===============================
// 应用启动配置模块
// src/config/app-bootstrap.config.ts
// ===============================
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config.service';
import { setupSwagger } from '../swagger/swagger.config';
import helmet from 'helmet';

export class AppBootstrapConfig {
  constructor(
    private readonly app: INestApplication,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 配置应用安全头
   */
  configureHelmet(): void {
    const isProduction = this.configService.app.environment === 'production';

    this.app.use(
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
  }

  /**
   * 配置CORS策略
   */
  configureCors(): void {
    // const isProduction = this.configService.app.environment === 'production';
    const isDevelopment = this.configService.app.environment === 'development';

    if (isDevelopment) {
      // 开发环境宽松配置
      this.app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      });
    } else {
      // 生产环境严格配置
      const allowedOrigins = this.getAllowedOrigins();

      this.app.enableCors({
        origin: this.createOriginValidator(allowedOrigins),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400, // 24小时预检缓存
      });
    }
  }

  /**
   * 配置全局验证管道
   */
  configureValidation(): void {
    const isDevelopment = this.configService.app.environment === 'development';

    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: !isDevelopment,
        skipMissingProperties: false,
        skipNullProperties: false,
        skipUndefinedProperties: false,
        enableDebugMessages: isDevelopment,
        stopAtFirstError: !isDevelopment,
      }),
    );
  }

  /**
   * 配置API文档
   */
  configureSwagger(): void {
    const isDevelopment = this.configService.app.environment === 'development';
    const isTest = this.configService.app.environment === 'test';

    if (isDevelopment || isTest) {
      setupSwagger(this.app);
    }
  }

  /**
   * 设置全局API前缀
   */
  setGlobalPrefix(): void {
    this.app.setGlobalPrefix(this.configService.app.globalPrefix);
  }

  /**
   * 获取允许的跨域源
   */
  private getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    return envOrigins
      ? envOrigins.split(',').map((origin) => origin.trim())
      : [];
  }

  /**
   * 创建跨域源验证器（修复类型安全问题）
   */
  private createOriginValidator(allowedOrigins: string[]) {
    return (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ): void => {
      // 允许移动应用的无origin请求
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('不允许的跨域请求'), false);
      }
    };
  }

  /**
   * 获取启动信息
   */
  getStartupInfo(): Record<string, unknown> {
    const isDevelopment = this.configService.app.environment === 'development';

    return {
      message: '应用启动成功',
      port: this.configService.app.port,
      environment: this.configService.app.environment,
      apiPrefix: this.configService.app.globalPrefix,
      swaggerUrl: isDevelopment
        ? `http://localhost:${this.configService.app.port}/api`
        : null,
      healthCheck: `http://localhost:${this.configService.app.port}/${this.configService.app.globalPrefix}/health`,
    };
  }
}
