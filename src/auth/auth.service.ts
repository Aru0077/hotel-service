// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, CreateUserDto } from '../users/users.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  RegisterUserDto,
  RegisterMerchantDto,
  RegisterAdminDto,
} from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerUser(registerDto: RegisterUserDto): Promise<AuthResponseDto> {
    const createUserDto: CreateUserDto = {
      ...registerDto,
      role: UserRole.USER,
    };

    const user = await this.usersService.createUser(createUserDto);
    return this.generateAuthResponse(user);
  }

  async registerMerchant(
    registerDto: RegisterMerchantDto,
  ): Promise<AuthResponseDto> {
    const createUserDto: CreateUserDto = {
      ...registerDto,
      role: UserRole.MERCHANT,
    };

    const user = await this.usersService.createUser(createUserDto);
    return this.generateAuthResponse(user);
  }

  async registerAdmin(registerDto: RegisterAdminDto): Promise<AuthResponseDto> {
    const createUserDto: CreateUserDto = {
      ...registerDto,
      role: UserRole.ADMIN,
    };

    const user = await this.usersService.createUser(createUserDto);
    return this.generateAuthResponse(user);
  }

  async login(username: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户状态异常，请联系管理员');
    }

    // 更新最后登录时间
    await this.usersService.updateLastLogin(user.id);

    const { password: _, ...userWithoutPassword } = user;
    return this.generateAuthResponse(userWithoutPassword);
  }

  private generateAuthResponse(user: any): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        email: user.email,
        phone: user.phone,
      },
    };
  }
}
