// # 2. 用户接口定义
// # src/auth/interfaces/user.interface.ts
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface AuthResult {
  access_token: string;
  user: Omit<User, 'password'>;
}
