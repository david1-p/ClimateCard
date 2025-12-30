# Multi-stage build for Java Spring Boot Application

# Stage 1: Build
FROM gradle:8.5-jdk21 AS build

WORKDIR /app

# Copy Gradle files
COPY build.gradle settings.gradle ./
COPY gradle ./gradle

# Download dependencies (캐싱 최적화)
RUN gradle build --no-daemon || return 0

# Copy source code
COPY src ./src

# Build application (테스트 스킵 - CI/CD에서 이미 테스트 완료 가정)
RUN gradle clean build --no-daemon -x test

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# 타임존 설정
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# 보안: non-root 사용자 생성
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

# JAR 파일 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 소유권 변경
RUN chown -R appuser:appuser /app

# non-root 사용자로 전환
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# 포트 노출
EXPOSE 8080

# JVM 메모리 설정 (1GB RAM 환경 최적화)
# 최소/최대 메모리를 줄여서 다른 서비스(PostgreSQL, Redis, Nginx)와 공존
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport -XX:MaxRAMPercentage=50.0 -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# 애플리케이션 실행
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
