import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  Configuration,
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  JwtConfig,
} from './config.interface';
import { ErrorUtil } from '../common/utils/error.util';

@Injectable()
export class ConfigService {
  private readonly _appConfig: AppConfig;
  private readonly _databaseConfig: DatabaseConfig;
  private readonly _redisConfig: RedisConfig;
  private readonly _jwtConfig: JwtConfig;
  private readonly _configuration: Configuration;

  constructor(private configService: NestConfigService) {
    // 构造函数中一次性初始化所有配置
    try {
      this._appConfig = {
        port: this.configService.get<number>('PORT') ?? 3000,
        environment:
          this.configService.get<string>('NODE_ENV') ?? 'development',
      };

      this._databaseConfig = {
        url: this.configService.get<string>('DATABASE_URL')!,
        maxConnections:
          this.configService.get('DATABASE_MAX_CONNECTIONS') ?? 10,
        timeout: this.configService.get('DATABASE_TIMEOUT') ?? 20000,
      };

      this._redisConfig = {
        host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
        port: this.configService.get<number>('REDIS_PORT') ?? 6379,
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB') ?? 0,
        maxRetries: this.configService.get<number>('REDIS_MAX_RETRIES') ?? 3,
        connectTimeout:
          this.configService.get<number>('REDIS_CONNECT_TIMEOUT') ?? 10000,
        commandTimeout:
          this.configService.get<number>('REDIS_COMMAND_TIMEOUT') ?? 5000,
      };

      this._jwtConfig = {
        secret: this.getRequiredConfig<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d',
      };

      this._configuration = {
        app: this._appConfig,
        database: this._databaseConfig,
        redis: this._redisConfig,
        jwt: this._jwtConfig,
      };
    } catch (error) {
      const errorMessage = ErrorUtil.getErrorMessage(error);
      throw new Error(`配置初始化失败: ${errorMessage}`);
    }
  }

  private getRequiredConfig<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined || value === null) {
      throw new Error(`必需的配置项 ${key} 未设置`);
    }
    return value;
  }

  get app(): AppConfig {
    return this._appConfig;
  }

  get database(): DatabaseConfig {
    return this._databaseConfig;
  }

  get redis(): RedisConfig {
    return this._redisConfig;
  }

  get jwt(): JwtConfig {
    return this._jwtConfig;
  }

  get config(): Configuration {
    return this._configuration;
  }
}
