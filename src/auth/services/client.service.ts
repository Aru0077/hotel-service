import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from './user.service';
import { ClientRegisterDto, FacebookLoginDto } from '../dto/auth.dto';
import { AuthType, User, UserRole } from '@prisma/client';

export interface FacebookUserData {
  id: string;
  name?: string;
  email?: string;
}

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  /**
   * 普通用户注册（用户名密码方式）
   */
  async registerWithPassword(dto: ClientRegisterDto): Promise<User> {
    const { username, password } = dto;

    // 检查用户名是否已存在
    const existingUser = await this.userService.findUserByAuth(
      AuthType.PASSWORD,
      username,
    );
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 创建用户
    const user = await this.userService.createUser({
      role: UserRole.CLIENT,
    });

    // 创建密码认证凭据
    await this.userService.createAuthCredential({
      userId: user.id,
      authType: AuthType.PASSWORD,
      identifier: username,
      credential: password,
    });

    // 创建客户端资料，使用username作为facebookId的占位符
    // 这样做是为了满足数据库的唯一约束
    const facebookIdPlaceholder = `username_${user.id}_${username}`;

    await this.prisma.clientProfile.create({
      data: {
        userId: user.id,
        facebookId: facebookIdPlaceholder,
      },
    });

    return user;
  }

  /**
   * Facebook登录/注册
   */
  async loginWithFacebook(dto: FacebookLoginDto): Promise<User> {
    const { accessToken, fullName } = dto;

    // 验证Facebook访问令牌并获取用户信息
    const facebookUser = await this.validateFacebookToken(accessToken);

    // 查找是否已存在此Facebook用户
    let user = await this.findUserByFacebookId(facebookUser.id);

    if (!user) {
      // 新用户注册
      user = await this.registerWithFacebook(facebookUser, fullName);
    }

    return user;
  }

  /**
   * 绑定Facebook账号到现有用户
   */
  async bindFacebookAccount(
    userId: number,
    accessToken: string,
  ): Promise<void> {
    const facebookUser = await this.validateFacebookToken(accessToken);

    // 检查该Facebook账号是否已被其他用户绑定
    const existingUser = await this.findUserByFacebookId(facebookUser.id);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('该Facebook账号已被其他用户绑定');
    }

    // 更新用户的Facebook信息
    await this.prisma.clientProfile.update({
      where: { userId },
      data: {
        facebookId: facebookUser.id,
        fullName: facebookUser.name,
      },
    });

    // 创建Facebook认证凭据
    try {
      await this.userService.createAuthCredential({
        userId,
        authType: AuthType.FACEBOOK,
        identifier: facebookUser.id,
      });
    } catch (error) {
      // 如果已存在，忽略错误
      if (!(error instanceof ConflictException)) {
        throw error;
      }
    }
  }

  /**
   * 设置用户名密码（Facebook注册用户）
   */
  async setUsernamePassword(
    userId: number,
    username: string,
    password: string,
  ): Promise<void> {
    // 检查用户名是否已存在
    const existingUser = await this.userService.findUserByAuth(
      AuthType.PASSWORD,
      username,
    );
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('用户名已存在');
    }

    // 创建或更新密码认证凭据
    try {
      await this.userService.createAuthCredential({
        userId,
        authType: AuthType.PASSWORD,
        identifier: username,
        credential: password,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        // 如果已存在，则更新
        await this.userService.updateAuthCredential(
          userId,
          AuthType.PASSWORD,
          username,
          password,
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取客户端用户详细信息
   */
  async getClientProfile(userId: number) {
    return await this.prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            authCredentials: {
              select: {
                authType: true,
                identifier: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 更新客户端资料
   */
  async updateClientProfile(
    userId: number,
    data: { fullName?: string; avatar?: string },
  ) {
    return await this.prisma.clientProfile.update({
      where: { userId },
      data,
    });
  }

  /**
   * 根据Facebook ID查找用户
   */
  private async findUserByFacebookId(facebookId: string): Promise<User | null> {
    const profile = await this.prisma.clientProfile.findUnique({
      where: { facebookId },
      include: { user: true },
    });

    return profile?.user || null;
  }

  /**
   * Facebook新用户注册
   */
  private async registerWithFacebook(
    facebookUser: FacebookUserData,
    providedName?: string,
  ): Promise<User> {
    // 创建用户
    const user = await this.userService.createUser({
      role: UserRole.CLIENT,
    });

    // 创建Facebook认证凭据
    await this.userService.createAuthCredential({
      userId: user.id,
      authType: AuthType.FACEBOOK,
      identifier: facebookUser.id,
    });

    // 创建客户端资料
    await this.prisma.clientProfile.create({
      data: {
        userId: user.id,
        facebookId: facebookUser.id,
        fullName: providedName || facebookUser.name || `用户${user.id}`,
      },
    });

    return user;
  }

  /**
   * 验证Facebook访问令牌（模拟实现）
   * 在实际项目中，这里应该调用Facebook Graph API验证令牌
   */
  private async validateFacebookToken(
    accessToken: string,
  ): Promise<FacebookUserData> {
    // 这里是简化的实现，实际应该调用Facebook API
    // 暂时返回模拟数据用于开发测试
    if (!accessToken || accessToken.length < 10) {
      throw new BadRequestException('无效的Facebook访问令牌');
    }

    // 模拟从Facebook获取的用户信息
    const mockFacebookData: FacebookUserData = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Facebook用户',
    };

    return mockFacebookData;

    // 实际实现应该是这样：
    /*
    try {
      const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
      const userData = await response.json();
      
      if (userData.error) {
        throw new BadRequestException('Facebook令牌验证失败');
      }
      
      return userData;
    } catch (error) {
      throw new BadRequestException('Facebook令牌验证失败');
    }
    */
  }
}
