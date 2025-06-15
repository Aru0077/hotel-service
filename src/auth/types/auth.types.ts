// src/auth/types/auth.types.ts
import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  email?: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthenticatedUser;
}

// 扩展Express Request类型
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
