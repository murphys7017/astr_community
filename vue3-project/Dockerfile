# 多阶段构建：构建阶段
FROM node:18-alpine AS build-stage

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 传递前端构建环境变量
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_REAL_API=false
ARG VITE_APP_TITLE
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_USE_REAL_API=${VITE_USE_REAL_API}
ENV VITE_APP_TITLE=${VITE_APP_TITLE}

# 构建应用
RUN npm run build

# 生产阶段：使用nginx服务静态文件
FROM nginx:alpine AS production-stage

# 复制构建产物到nginx目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 复制nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
