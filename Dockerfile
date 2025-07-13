# 多阶段构建 - 构建阶段
FROM node:22-alpine AS builder

# 配置Alpine包管理器使用国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖
RUN apk add --no-cache \
    openssl \
    python3 \
    make \
    g++

# 设置npm配置
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /app

# 复制依赖配置文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖并生成Prisma客户端
RUN npm ci --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force

# 复制源代码并构建应用
COPY . .
RUN npm run build

# 生产阶段
FROM node:22-alpine AS production

# 配置Alpine包管理器使用国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装运行时依赖
RUN apk add --no-cache openssl

# 设置npm配置
RUN npm config set registry https://registry.npmmirror.com

# 创建应用用户
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nestjs

WORKDIR /app

# 复制package文件和Prisma配置
COPY package*.json ./
COPY prisma ./prisma/

# 安装生产依赖
RUN npm ci --only=production --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force

# 从构建阶段复制应用代码
COPY --from=builder /app/dist ./dist

# 复制环境配置文件
COPY .env.production ./.env

# 设置文件权限
RUN chown -R nestjs:nodejs /app

# 切换到非特权用户
USER nestjs

# 暴露应用端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# 启动应用
CMD ["node", "dist/main.js"]