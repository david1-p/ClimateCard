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
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일이 없습니다!${NC}"
    echo "   .env.example을 복사하여 .env 파일을 생성하고 값을 설정하세요."
    exit 1
fi

# 중요 환경 변수 확인
source .env
if [ "$DB_PASSWORD" == "1q2w" ]; then
    echo -e "${RED}❌ 프로덕션에서 기본 DB 비밀번호를 사용하고 있습니다!${NC}"
    echo "   강력한 비밀번호로 변경하세요: openssl rand -base64 32"
    exit 1
fi

echo -e "${GREEN}✅ 환경 변수 확인 완료${NC}"
echo ""

# 2. 프론트엔드 빌드
echo "🏗️  2. 프론트엔드 빌드..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   npm 의존성 설치 중..."
    npm install
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

# 3. 백엔드 테스트 (선택적)
echo "🧪 3. 백엔드 테스트..."
if [ "$1" != "--skip-tests" ]; then
    cd backend
    ./gradlew test
    cd ..
    echo -e "${GREEN}✅ 테스트 통과${NC}"
else
    echo -e "${YELLOW}⚠️  테스트 스킵됨${NC}"
fi
echo ""

# 4. Docker 이미지 빌드
echo "🐳 4. Docker 이미지 빌드..."
docker-compose -f docker-compose.prod.yml build

echo -e "${GREEN}✅ Docker 이미지 빌드 완료${NC}"
echo ""

# 5. 이전 컨테이너 중지 및 삭제
echo "🔄 5. 이전 컨테이너 중지..."
docker-compose -f docker-compose.prod.yml down

echo -e "${GREEN}✅ 이전 컨테이너 중지 완료${NC}"
echo ""

# 6. 새 컨테이너 시작
echo "🚀 6. 새 컨테이너 시작..."
docker-compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✅ 컨테이너 시작 완료${NC}"
echo ""

# 7. 헬스체크
echo "🏥 7. 헬스체크..."
echo "   백엔드 시작 대기 중..."
sleep 30

HEALTH_CHECK_URL="http://localhost:8080/actuator/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
        echo -e "${GREEN}✅ 백엔드 정상 동작${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   재시도 중... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ 백엔드 헬스체크 실패!${NC}"
    echo "   로그를 확인하세요: docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

echo ""

# 8. 정리
echo "🧹 8. 불필요한 이미지 정리..."
docker image prune -f

echo -e "${GREEN}✅ 정리 완료${NC}"
echo ""

# 9. 배포 완료
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 서비스 상태 확인:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🔗 접속 URL:"
echo "   - HTTP:  http://localhost"
echo "   - HTTPS: https://localhost (인증서 설정 후)"
echo "   - API:   http://localhost/api"
echo ""
echo "📝 유용한 명령어:"
echo "   로그 확인:   docker-compose -f docker-compose.prod.yml logs -f"
echo "   중지:        docker-compose -f docker-compose.prod.yml stop"
echo "   재시작:      docker-compose -f docker-compose.prod.yml restart"
echo "   완전 삭제:   docker-compose -f docker-compose.prod.yml down -v"
echo ""
