// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserService } from './services/user.service';
import { ClientService } from './services/client.service';
import { BusinessService } from './services/business.service';
import { AdminService } from './services/admin.service';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    ClientService,
    BusinessService,
    AdminService,
    AuthGuard,
    RoleGuard,
  ],
  exports: [AuthService, UserService, AuthGuard, RoleGuard],
})
export class AuthModule {}
