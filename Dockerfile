# 使用与本地开发环境一致的Node.js版本
FROM node:22-alpine

# 安装必要的系统依赖
RUN apk add --no-cache dumb-init

# 创建应用目录
WORKDIR /app

# 复制package文件并安装依赖
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 复制环境配置文件
COPY .env.production ./.env

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# 切换到非root用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js || exit 1

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]