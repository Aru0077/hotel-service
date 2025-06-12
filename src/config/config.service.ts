import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  Configuration,
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  JwtConfig,
} from './config.interface';

@Injectable()
export class ConfigService {
  // 私有缓存字段
  private _appConfig: AppConfig | null = null;
  private _databaseConfig: DatabaseConfig | null = null;
  private _redisConfig: RedisConfig | null = null;
  private _jwtConfig: JwtConfig | null = null;
  private _configuration: Configuration | null = null;

  constructor(private configService: NestConfigService) {}

  get app(): AppConfig {
    this._appConfig ??= {
      port: this.configService.get<number>('PORT')!,
      environment: this.configService.get<string>('NODE_ENV')!,
    };
    return this._appConfig;
  }

  get database(): DatabaseConfig {
    this._databaseConfig ??= {
      url: this.configService.get<string>('DATABASE_URL')!,
    };
    return this._databaseConfig;
  }

  get redis(): RedisConfig {
    this._redisConfig ??= {
      host: this.configService.get<string>('REDIS_HOST')!,
      port: this.configService.get<number>('REDIS_PORT')!,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB')!,
    };
    return this._redisConfig;
  }

  get jwt(): JwtConfig {
    this._jwtConfig ??= {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN')!,
    };
    return this._jwtConfig;
  }

  get config(): Configuration {
    this._configuration ??= {
      app: this.app,
      database: this.database,
      redis: this.redis,
      jwt: this.jwt,
    };
    return this._configuration;
  }

  /**
   * 清除所有缓存（可选方法，用于测试或配置重载场景）
   */
  clearCache(): void {
    this._appConfig = null;
    this._databaseConfig = null;
    this._redisConfig = null;
    this._jwtConfig = null;
    this._configuration = null;
  }

  /**
   * 验证配置是否已正确加载（可选方法，用于健康检查）
   */
  validateConfiguration(): boolean {
    try {
      // 通过访问所有配置属性来触发验证
      const config = this.config;
      return !!(
        config.app.port &&
        config.app.environment &&
        config.database.url &&
        config.redis.host &&
        config.jwt.secret
      );
    } catch {
      return false;
    }
  }
}
