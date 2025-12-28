#!/bin/bash
# 기후동행카드 조회 시스템 - 프로덕션 배포 스크립트

set -e  # 에러 발생 시 즉시 종료

echo "🚀 기후동행카드 조회 시스템 배포 시작..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 환경 변수 확인
echo "📋 1. 환경 변수 확인..."
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production 파일이 없습니다!${NC}"
    echo "   .env.production.example을 복사하여 .env.production 파일을 생성하고 값을 설정하세요."
    echo "   cp .env.production.example .env.production"
    exit 1
fi

# 중요 환경 변수 확인
source .env.production
if [ "$DB_PASSWORD" == "CHANGE_ME_STRONG_PASSWORD" ] || [ "$DB_PASSWORD" == "1q2w" ]; then
    echo -e "${RED}❌ 프로덕션에서 기본 DB 비밀번호를 사용하고 있습니다!${NC}"
    echo "   강력한 비밀번호로 변경하세요: openssl rand -base64 32"
    exit 1
fi

echo -e "${GREEN}✅ 환경 변수 확인 완료${NC}"
echo ""

# 2. 프론트엔드 빌드
echo "🏗️  2. 프론트엔드 빌드..."
cd frontend

# 프론트엔드 환경 변수 설정
echo "VITE_KAKAO_APP_KEY=${VITE_KAKAO_APP_KEY}" > .env
echo "VITE_KAKAO_OPENCHAT_URL=${VITE_KAKAO_OPENCHAT_URL}" >> .env
echo "VITE_SENTRY_DSN=${VITE_SENTRY_DSN}" >> .env

if [ ! -d "node_modules" ]; then
    echo "   npm 의존성 설치 중..."
    npm ci
fi

echo "   프로덕션 빌드 중..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 프론트엔드 빌드 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 프론트엔드 빌드 완료${NC}"
echo ""

cd ..

# 3. Docker 이미지 빌드
echo "🐳 3. Docker 이미지 빌드..."
docker-compose --profile prod build --no-cache

echo -e "${GREEN}✅ Docker 이미지 빌드 완료${NC}"
echo ""

# 4. 이전 컨테이너 중지 및 삭제
echo "🔄 4. 이전 컨테이너 중지..."
docker-compose --profile prod down

echo -e "${GREEN}✅ 이전 컨테이너 중지 완료${NC}"
echo ""

# 5. 새 컨테이너 시작
echo "🚀 5. 새 컨테이너 시작..."
docker-compose --env-file .env.production --profile prod up -d

echo -e "${GREEN}✅ 컨테이너 시작 완료${NC}"
echo ""

# 6. 헬스체크
echo "🏥 6. 헬스체크..."
echo "   백엔드 시작 대기 중 (최대 2분)..."

HEALTH_CHECK_URL="http://localhost:8080/actuator/health"
MAX_RETRIES=24
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5
    if curl -f -s $HEALTH_CHECK_URL > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 백엔드 정상 작동 확인!${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   재시도 중... ($RETRY_COUNT/$MAX_RETRIES)"
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ 백엔드 헬스체크 실패!${NC}"
    echo "   로그를 확인하세요: docker-compose --profile prod logs backend"
    exit 1
fi

echo ""

# 7. 정리
echo "🧹 7. 불필요한 이미지 정리..."
docker image prune -f

echo -e "${GREEN}✅ 정리 완료${NC}"
echo ""

# 8. 배포 완료
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 서비스 상태 확인:"
docker-compose --profile prod ps
echo ""
echo "🔗 접속 URL:"
echo "   - HTTP:  http://your-server-ip"
echo "   - HTTPS: https://기후동행.site (SSL 인증서 설정 후)"
echo "   - API:   http://your-server-ip/api"
echo ""
echo "📝 유용한 명령어:"
echo "   로그 확인:   docker-compose --profile prod logs -f"
echo "   특정 서비스: docker-compose --profile prod logs -f backend"
echo "   중지:        docker-compose --profile prod stop"
echo "   재시작:      docker-compose --profile prod restart"
echo "   완전 삭제:   docker-compose --profile prod down -v"
echo ""
