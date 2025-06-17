# 使用Debian基础镜像替代Alpine解决OpenSSL兼容性问题
FROM node:22-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖和OpenSSL
RUN sed -i 's@http://deb.debian.org@https://mirrors.aliyun.com@g' /etc/apt/sources.list && \
    apt-get update && apt-get install -y \
    dumb-init \
    curl \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖配置文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖
RUN npm ci

# 复制TypeScript配置文件
COPY tsconfig*.json ./
COPY nest-cli.json ./

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npx nest build --tsc

# 清理开发依赖以减小镜像大小
RUN npm prune --production

# 创建非root用户
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nestjs && \
    chown -R nestjs:nodejs /app

# 切换到非root用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/v1/health || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]