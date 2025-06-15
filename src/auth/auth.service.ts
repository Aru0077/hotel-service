// # 6. 认证服务
// # src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  UserRegisterDto,
  MerchantRegisterDto,
  AdminRegisterDto,
  LoginDto,
} from './dto/auth.dto';
import { AuthResult } from './interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerUser(registerDto: UserRegisterDto): Promise<AuthResult> {
    this.validatePasswordMatch(
      registerDto.password,
      registerDto.confirmPassword,
    );

    const userExists = await this.usersService.checkUserExists(
      registerDto.username,
      registerDto.email,
    );
    if (userExists) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.usersService.createUserWithProfile({
      username: registerDto.username,
      password: hashedPassword,
      email: registerDto.email,
      role: UserRole.USER,
      nickname: registerDto.nickname,
    });

    return this.generateAuthResult(user);
  }

  async registerMerchant(
    registerDto: MerchantRegisterDto,
  ): Promise<AuthResult> {
    this.validatePasswordMatch(
      registerDto.password,
      registerDto.confirmPassword,
    );

    const userExists = await this.usersService.checkUserExists(
      registerDto.username,
      registerDto.email,
      registerDto.phone,
    );
    if (userExists) {
      throw new ConflictException('用户名、邮箱或手机号已存在');
    }

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.usersService.createUserWithProfile({
      username: registerDto.username,
      password: hashedPassword,
      email: registerDto.email,
      phone: registerDto.phone,
      role: UserRole.MERCHANT,
      status: UserStatus.PENDING_VERIFICATION,
      nickname: registerDto.contactPerson,
    });

    return this.generateAuthResult(user);
  }

  async registerAdmin(registerDto: AdminRegisterDto): Promise<AuthResult> {
    this.validatePasswordMatch(
      registerDto.password,
      registerDto.confirmPassword,
    );

    const userExists = await this.usersService.checkUserExists(
      registerDto.username,
      registerDto.email,
      registerDto.phone,
    );
    if (userExists) {
      throw new ConflictException('用户名、邮箱或手机号已存在');
    }

    const hashedPassword = await this.hashPassword(registerDto.password);

    const user = await this.usersService.createUser({
      username: registerDto.username,
      password: hashedPassword,
      email: registerDto.email,
      phone: registerDto.phone,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    return this.generateAuthResult(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByIdentifier(loginDto.identifier);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户已被禁用或需要验证');
    }

    // 移除密码字段
    const { password, ...userWithoutPassword } = user;
    return this.generateAuthResult(userWithoutPassword);
  }

  private validatePasswordMatch(
    password: string,
    confirmPassword: string,
  ): void {
    if (password !== confirmPassword) {
      throw new BadRequestException('密码和确认密码不匹配');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private generateAuthResult(user: Omit<any, 'password'>): AuthResult {
    const payload = {
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
