// ## 1. 认证常量配置
// src/auth/constants.ts
export const jwtConstants = {
  secret: process.env.JWT_SECRET ?? 'DO_NOT_USE_THIS_VALUE_IN_PRODUCTION',
};
