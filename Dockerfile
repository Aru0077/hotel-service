# 多阶段构建 - 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制package文件和Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括开发依赖）
RUN npm ci

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建NestJS应用
RUN npm run build

# 生产阶段
FROM node:22-alpine AS production

WORKDIR /app

# 安装curl用于健康检查
RUN apk add --no-cache dumb-init curl

# 创建非root用户提高安全性
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 复制package文件和Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# 只安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

# 从构建阶段复制编译后的代码和Prisma客户端
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 修改文件所有者
RUN chown -R nestjs:nodejs /app

# 切换到非root用户
USER nestjs

# 暴露应用端口
EXPOSE 3000

# 健康检查 - 直接使用你现有的health接口
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/v1/health || exit 1

# 使用dumb-init启动应用，确保信号正确传递
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]