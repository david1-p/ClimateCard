#!/bin/bash
# 기후동행카드 조회 시스템 - Vultr 서버 배포 스크립트
# 사용법: ./deploy.sh

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
    echo "   cp .env.example .env"
    echo "   nano .env  # 필수 값 설정"
    exit 1
fi

# DB_PASSWORD 확인
if ! grep -q "^DB_PASSWORD=" .env || grep -q "^DB_PASSWORD=CHANGE_ME" .env; then
    echo -e "${RED}❌ .env 파일에서 DB_PASSWORD를 설정해주세요!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 환경 변수 확인 완료${NC}"
echo ""

# 2. Node.js 확인 및 설치
echo "📦 2. Node.js 확인..."
if ! command -v node &> /dev/null; then
    echo "   Node.js 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "   Node.js 버전: $(node --version)"
echo -e "${GREEN}✅ Node.js 준비 완료${NC}"
echo ""

# 3. 프론트엔드 빌드
echo "🏗️  3. 프론트엔드 빌드..."
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

# 4. Docker 확인
echo "🐳 4. Docker 확인..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되지 않았습니다!${NC}"
    echo "   설치 명령어: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo "   Docker 버전: $(docker --version)"
echo -e "${GREEN}✅ Docker 준비 완료${NC}"
echo ""

# 5. 기존 컨테이너 정리 (볼륨 포함)
echo "🧹 5. 기존 컨테이너 정리..."
docker compose --profile prod down -v || true
echo -e "${GREEN}✅ 정리 완료${NC}"
echo ""

# 6. 새 컨테이너 시작
echo "🚀 6. Docker Compose로 서비스 시작..."
docker compose --profile prod up -d

echo -e "${GREEN}✅ 컨테이너 시작 완료${NC}"
echo ""

# 7. 헬스체크
echo "🏥 7. 서비스 헬스체크..."
echo "   백엔드 시작 대기 중 (최대 90초)..."

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 3
    if docker compose exec -T backend wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health 2>/dev/null; then
        echo -e "${GREEN}✅ 백엔드 정상 작동 확인!${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   대기 중... (${RETRY_COUNT}/${MAX_RETRIES})"
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠️  백엔드 헬스체크 타임아웃${NC}"
    echo "   로그를 확인하세요: docker compose logs backend"
fi

echo ""

# 8. 배포 완료
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 서비스 상태:"
docker compose ps
echo ""

# 서버 IP 가져오기
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

echo "🔗 접속 URL:"
echo "   - 웹사이트:      http://${SERVER_IP}"
echo "   - API:           http://${SERVER_IP}/api"
echo "   - Health Check:  http://${SERVER_IP}:8080/actuator/health"
echo ""
echo "📝 유용한 명령어:"
echo "   전체 로그:       docker compose logs -f"
echo "   Backend 로그:    docker compose logs -f backend"
echo "   서비스 재시작:   docker compose restart"
echo "   서비스 중지:     docker compose down"
echo "   완전 삭제:       docker compose down -v"
echo ""
