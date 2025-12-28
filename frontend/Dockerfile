# Multi-stage build for React Vite Application

# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 설치 (캐싱 최적화)
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN npm run build

# Stage 2: Nginx로 정적 파일 서빙 (경량화)
FROM nginx:alpine

# 타임존 설정
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# Nginx 기본 설정 제거
RUN rm /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 포트 노출
EXPOSE 80

# Nginx 실행 (데몬 모드 비활성화)
CMD ["nginx", "-g", "daemon off;"]
