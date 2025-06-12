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
  private readonly _appConfig: AppConfig;
  private readonly _databaseConfig: DatabaseConfig;
  private readonly _redisConfig: RedisConfig;
  private readonly _jwtConfig: JwtConfig;
  private readonly _configuration: Configuration;

  constructor(private configService: NestConfigService) {
    // 构造函数中一次性初始化所有配置
    this._appConfig = {
      port: this.configService.get<number>('PORT')!,
      environment: this.configService.get<string>('NODE_ENV')!,
    };

    this._databaseConfig = {
      url: this.configService.get<string>('DATABASE_URL')!,
      maxConnections: this.configService.get('DATABASE_MAX_CONNECTIONS')!,
      timeout: this.configService.get('DATABASE_TIMEOUT')!,
    };

    this._redisConfig = {
      host: this.configService.get<string>('REDIS_HOST')!,
      port: this.configService.get<number>('REDIS_PORT')!,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB')!,
      maxRetries: this.configService.get<number>('REDIS_MAX_RETRIES')!,
      connectTimeout: this.configService.get<number>('REDIS_CONNECT_TIMEOUT')!,
      commandTimeout: this.configService.get<number>('REDIS_COMMAND_TIMEOUT')!,
    };

    this._jwtConfig = {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN')!,
    };

    this._configuration = {
      app: this._appConfig,
      database: this._databaseConfig,
      redis: this._redisConfig,
      jwt: this._jwtConfig,
    };
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
