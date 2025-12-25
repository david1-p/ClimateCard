#!/bin/bash
# Vultr CentOS/Rocky Linux 서버 초기 설정 스크립트
# 기후동행카드 조회 시스템

set -e  # 에러 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 기후동행카드 서버 초기 설정 시작${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 이 스크립트는 root 권한이 필요합니다.${NC}"
    echo "   sudo ./server-init.sh 로 실행하세요."
    exit 1
fi

# OS 확인
if [ ! -f /etc/redhat-release ]; then
    echo -e "${RED}❌ CentOS/Rocky Linux가 아닙니다.${NC}"
    echo "   이 스크립트는 CentOS/Rocky Linux 전용입니다."
    exit 1
fi

echo -e "${GREEN}✅ OS 확인: $(cat /etc/redhat-release)${NC}"
echo ""

# 1. 시스템 업데이트
echo -e "${YELLOW}📦 1. 시스템 업데이트 중...${NC}"
dnf update -y

echo -e "${GREEN}✅ 시스템 업데이트 완료${NC}"
echo ""

# 2. 필수 패키지 설치
echo -e "${YELLOW}📦 2. 필수 패키지 설치 중...${NC}"
dnf install -y epel-release
dnf install -y curl wget git nano vim htop

echo -e "${GREEN}✅ 필수 패키지 설치 완료${NC}"
echo ""

# 3. Docker 설치
echo -e "${YELLOW}🐳 3. Docker 설치 중...${NC}"

# Docker 저장소 추가
dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo

# Docker 설치
dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker 서비스 시작 및 자동 시작 설정
systemctl start docker
systemctl enable docker

# Docker 버전 확인
DOCKER_VERSION=$(docker --version)
echo -e "${GREEN}✅ Docker 설치 완료: ${DOCKER_VERSION}${NC}"
echo ""

# 4. Docker Compose 설치
echo -e "${YELLOW}🐳 4. Docker Compose 설치 중...${NC}"

# 최신 버전 가져오기
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

# Docker Compose 다운로드
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 실행 권한 부여
chmod +x /usr/local/bin/docker-compose

# Docker Compose 버전 확인
COMPOSE_VERSION=$(docker-compose --version)
echo -e "${GREEN}✅ Docker Compose 설치 완료: ${COMPOSE_VERSION}${NC}"
echo ""

# 5. Node.js 설치 (프론트엔드 빌드용)
echo -e "${YELLOW}📦 5. Node.js 설치 중...${NC}"

# Node.js 20.x 저장소 추가
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# Node.js 설치
dnf install -y nodejs

# Node.js 버전 확인
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js 설치 완료: ${NODE_VERSION}, npm: ${NPM_VERSION}${NC}"
echo ""

# 6. Certbot 설치 (HTTPS 인증서용)
echo -e "${YELLOW}🔐 6. Certbot 설치 중...${NC}"

# Certbot 설치
dnf install -y certbot python3-certbot-nginx

# Certbot 버전 확인
CERTBOT_VERSION=$(certbot --version)
echo -e "${GREEN}✅ Certbot 설치 완료: ${CERTBOT_VERSION}${NC}"
echo ""

# 7. 방화벽 설정
echo -e "${YELLOW}🛡️  7. 방화벽 설정 중...${NC}"

# firewalld가 설치되지 않았다면 설치
if ! systemctl is-active --quiet firewalld; then
    dnf install -y firewalld
    systemctl start firewalld
    systemctl enable firewalld
fi

# 방화벽 규칙 추가
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh

# 방화벽 재로드
firewall-cmd --reload

echo -e "${GREEN}✅ 방화벽 설정 완료${NC}"
echo ""

# 8. 타임존 설정
echo -e "${YELLOW}🕐 8. 타임존 설정 중...${NC}"

timedatectl set-timezone Asia/Seoul

TIMEZONE=$(timedatectl | grep "Time zone" | awk '{print $3}')
echo -e "${GREEN}✅ 타임존 설정 완료: ${TIMEZONE}${NC}"
echo ""

# 9. Swap 메모리 설정 (선택적, 메모리 부족 대비)
echo -e "${YELLOW}💾 9. Swap 메모리 확인 중...${NC}"

SWAP_SIZE=$(free -h | grep Swap | awk '{print $2}')
if [ "$SWAP_SIZE" == "0B" ]; then
    echo -e "${YELLOW}⚠️  Swap이 없습니다. 2GB Swap 생성 중...${NC}"

    # 2GB Swap 파일 생성
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # 부팅 시 자동 마운트
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

    echo -e "${GREEN}✅ Swap 메모리 생성 완료: 2GB${NC}"
else
    echo -e "${GREEN}✅ Swap 메모리 이미 존재: ${SWAP_SIZE}${NC}"
fi
echo ""

# 10. 프로젝트 디렉토리 생성
echo -e "${YELLOW}📁 10. 프로젝트 디렉토리 생성 중...${NC}"

mkdir -p /opt/climate-transport
mkdir -p /var/log/climate-transport

echo -e "${GREEN}✅ 프로젝트 디렉토리 생성 완료${NC}"
echo ""

# 11. 시스템 최적화
echo -e "${YELLOW}⚙️  11. 시스템 최적화 중...${NC}"

# 최대 파일 디스크립터 수 증가
cat >> /etc/security/limits.conf << EOF
* soft nofile 65535
* hard nofile 65535
EOF

# 커널 파라미터 최적화
cat >> /etc/sysctl.conf << EOF
# Network optimization
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10240 65535

# Memory optimization
vm.swappiness = 10
EOF

# 설정 적용
sysctl -p

echo -e "${GREEN}✅ 시스템 최적화 완료${NC}"
echo ""

# 완료 메시지
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 서버 초기 설정 완료!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 다음 단계:${NC}"
echo ""
echo "1. 프로젝트 파일을 /opt/climate-transport로 업로드"
echo "   scp -r /path/to/project root@SERVER_IP:/opt/climate-transport"
echo ""
echo "2. .env 파일 생성"
echo "   cd /opt/climate-transport"
echo "   nano .env"
echo ""
echo "3. 프론트엔드 빌드"
echo "   cd /opt/climate-transport/frontend"
echo "   npm install && npm run build"
echo ""
echo "4. Docker Compose 실행"
echo "   cd /opt/climate-transport"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "5. HTTPS 인증서 발급"
echo "   certbot certonly --standalone -d your-domain.com"
echo ""
echo -e "${GREEN}자세한 내용은 VULTR_SETUP.md를 참고하세요.${NC}"
echo ""
