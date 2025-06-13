// 1. 精简版响应接口定义
// src/common/interfaces/response.interface.ts
// ===============================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
  error?: string;
  statusCode?: number;
}
