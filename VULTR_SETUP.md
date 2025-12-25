# 🌐 Vultr 서버 생성 및 배포 가이드

## 1️⃣ Vultr 서버 생성 (5분)

### 1-1. Vultr 계정 생성 및 로그인
- https://www.vultr.com 접속
- 계정 생성 또는 로그인

### 1-2. 서버 생성

**Deploy New Server 클릭**

**1. Choose Server Type**
- **Cloud Compute - Shared CPU** 선택 (가성비 좋음)

**2. Choose Server Location**
- **Asia - Seoul, South Korea** 선택 (한국 서비스이므로)
- 또는 **Tokyo, Japan** (서울이 없는 경우)

**3. Choose Server Image**
- **Operating System** 선택
- **Rocky Linux 9** 또는 **CentOS Stream 9** 선택

**4. Choose Server Size**

권장 스펙:
```
💰 $12/월 (권장) - 프로덕션용
- 2 CPU
- 4 GB RAM
- 80 GB SSD
- 3 TB Bandwidth

💰 $6/월 - 테스트용 (최소 사양)
- 1 CPU
- 2 GB RAM
- 55 GB SSD
- 2 TB Bandwidth
```

**5. Additional Features**
- ✅ **Enable IPv6** (선택 사항)
- ✅ **Auto Backups** ($2/월, 권장)
- ❌ DDOS Protection (선택 사항, +$10/월)

**6. Server Hostname & Label**
- Hostname: `climate-transport`
- Label: `기후동행카드 서비스`

**7. Deploy Now!**
- 클릭 후 약 2-3분 대기

### 1-3. 서버 정보 확인

서버 생성 완료 후:
```
IP Address: xxx.xxx.xxx.xxx (이 IP를 기록!)
Username: root
Password: (Vultr에서 자동 생성, 복사해두기)
```

**서버 상태 확인**: Status가 **Running**이면 준비 완료

---

## 2️⃣ 도메인 DNS 설정

### 2-1. 도메인 등록 업체에서 DNS 설정

**가비아, 호스팅케이알, 후이즈 등**

DNS 레코드 추가:

| 타입 | 호스트(이름) | 값(IP) | TTL |
|------|--------------|--------|-----|
| A | @ | xxx.xxx.xxx.xxx | 3600 |
| A | www | xxx.xxx.xxx.xxx | 3600 |

예시 (도메인이 `기후동행.site`인 경우):
```
A    기후동행.site          xxx.xxx.xxx.xxx
A    www.기후동행.site      xxx.xxx.xxx.xxx
```

**⚠️ 주의**: DNS 전파에는 최대 24시간 소요 (보통 10분~1시간)

### 2-2. DNS 전파 확인

```bash
# 로컬 컴퓨터에서 실행
nslookup 기후동행.site

# 또는
ping 기후동행.site

# Vultr IP가 나오면 성공!
```

**온라인 도구**: https://dnschecker.org

---

## 3️⃣ 서버 최초 접속 및 설정

### 3-1. SSH 접속

**Mac/Linux:**
```bash
ssh root@xxx.xxx.xxx.xxx
# 비밀번호 입력 (Vultr에서 복사한 비밀번호)
```

**Windows:**
- PowerShell 또는 PuTTY 사용
```powershell
ssh root@xxx.xxx.xxx.xxx
```

### 3-2. 루트 비밀번호 변경 (보안 필수!)

```bash
passwd
# 새 비밀번호 입력
# 비밀번호 재확인
```

### 3-3. 시스템 업데이트

```bash
# CentOS/Rocky Linux
dnf update -y

# 재부팅 (권장)
reboot

# 재접속 (약 1분 후)
ssh root@xxx.xxx.xxx.xxx
```

---

## 4️⃣ 서버 초기 설정 (자동)

### 4-1. 초기 설정 스크립트 다운로드

서버에서 실행:
```bash
# 프로젝트 다운로드를 위한 Git 설치
dnf install -y git

# 프로젝트를 임시로 클론 (스크립트만 실행)
cd /tmp
git clone https://github.com/your-repo/climate-transport.git
cd climate-transport

# 또는 수동으로 스크립트 생성 (아래 내용 참고)
```

### 4-2. 초기 설정 스크립트 실행

아래 내용으로 스크립트 생성:

```bash
cat > /tmp/server-init.sh << 'EOF'
#!/bin/bash
# Vultr CentOS/Rocky Linux 서버 초기 설정

set -e

echo "🚀 서버 초기 설정 시작..."

# 1. Docker 설치
echo "📦 Docker 설치 중..."
dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io

systemctl start docker
systemctl enable docker

docker --version

# 2. Docker Compose 설치
echo "📦 Docker Compose 설치 중..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

docker-compose --version

# 3. Git 설치 (이미 설치되어 있을 수 있음)
echo "📦 Git 설치 중..."
dnf install -y git

git --version

# 4. Certbot 설치 (HTTPS 인증서용)
echo "🔐 Certbot 설치 중..."
dnf install -y epel-release
dnf install -y certbot

certbot --version

# 5. 방화벽 설정
echo "🛡️ 방화벽 설정 중..."
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# 6. 타임존 설정
echo "🕐 타임존 설정 중..."
timedatectl set-timezone Asia/Seoul

# 7. 프로젝트 디렉토리 생성
echo "📁 프로젝트 디렉토리 생성 중..."
mkdir -p /opt/climate-transport

echo "✅ 서버 초기 설정 완료!"
echo ""
echo "다음 단계:"
echo "1. 프로젝트 파일을 /opt/climate-transport로 업로드"
echo "2. .env 파일 생성"
echo "3. 배포 스크립트 실행"
EOF

chmod +x /tmp/server-init.sh
/tmp/server-init.sh
```

**실행 시간**: 약 5-10분

---

## 5️⃣ 프로젝트 업로드

### 방법 1: Git으로 업로드 (권장)

**5-1. GitHub에 프로젝트 푸시 (로컬에서)**
```bash
cd /Users/david/Desktop/기후동행

# Git 초기화가 안되어 있다면
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 생성 후
git remote add origin https://github.com/your-username/climate-transport.git
git push -u origin master
```

**5-2. 서버에서 클론**
```bash
cd /opt
git clone https://github.com/your-username/climate-transport.git
cd climate-transport
```

### 방법 2: SCP로 직접 업로드

**로컬 컴퓨터에서 실행:**
```bash
# 전체 프로젝트 업로드
scp -r /Users/david/Desktop/기후동행 root@xxx.xxx.xxx.xxx:/opt/

# 업로드 완료 확인
ssh root@xxx.xxx.xxx.xxx "ls -la /opt/기후동행"
```

---

## 6️⃣ 환경 변수 설정

### 서버에서 .env 파일 생성

```bash
cd /opt/climate-transport

# .env 파일 생성
nano .env
```

**.env 파일 내용** (프로덕션용):
```bash
# Database
DB_NAME=climate_transport
DB_USERNAME=postgres
DB_PASSWORD=<강력한_비밀번호>  # openssl rand -base64 32

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Keys
PUBLIC_API_SERVICE_KEY=<공공데이터포털_키>
SEOUL_API_KEY=<서울_열린데이터광장_키>
ADMIN_API_KEY=<새로운_강력한_키>  # openssl rand -base64 32

# Sentry
SENTRY_DSN=<Sentry_DSN>

# Profile
PROFILE=prod
```

**강력한 비밀번호 생성:**
```bash
openssl rand -base64 32
```

**저장**: Ctrl + O, Enter, Ctrl + X

---

## 7️⃣ 프론트엔드 빌드

### 7-1. Node.js 설치 (서버에서)

```bash
# Node.js 20.x 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# 확인
node --version
npm --version
```

### 7-2. 프론트엔드 빌드

```bash
cd /opt/climate-transport/frontend

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# dist 폴더 확인
ls -la dist/
```

---

## 8️⃣ Docker Compose 실행

```bash
cd /opt/climate-transport

# 서비스 시작
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

**예상 출력**:
```
NAME                          STATUS    PORTS
climate-transport-backend     Up        0.0.0.0:8080->8080/tcp
climate-transport-db          Up        0.0.0.0:5432->5432/tcp
climate-transport-nginx       Up        0.0.0.0:80->80/tcp
climate-transport-redis       Up        0.0.0.0:6379->6379/tcp
```

---

## 9️⃣ HTTPS 인증서 발급

### 9-1. 임시로 Nginx 중지

```bash
docker-compose -f docker-compose.prod.yml stop nginx
```

### 9-2. Certbot으로 인증서 발급

**도메인 이름을 실제 도메인으로 변경:**
```bash
certbot certonly --standalone \
  -d 기후동행.site \
  -d www.기후동행.site \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

**성공 메시지**:
```
Congratulations! Your certificate and chain have been saved at:
/etc/letsencrypt/live/기후동행.site/fullchain.pem
/etc/letsencrypt/live/기후동행.site/privkey.pem
```

### 9-3. Nginx 재시작

```bash
docker-compose -f docker-compose.prod.yml start nginx
```

---

## 🔟 배포 검증

### 10-1. HTTP 접속 테스트

```bash
curl http://기후동행.site
# 또는
curl http://xxx.xxx.xxx.xxx
```

### 10-2. HTTPS 접속 테스트

```bash
curl https://기후동행.site
```

### 10-3. API 테스트

```bash
curl https://기후동행.site/api/routes/search?keyword=421
```

### 10-4. 브라우저 접속

```
https://기후동행.site
```

**확인사항**:
- ✅ 페이지가 정상적으로 로드됨
- ✅ HTTPS 자물쇠 아이콘 표시
- ✅ 지도가 정상적으로 표시됨
- ✅ 검색 기능 동작

---

## 📊 배포 완료!

축하합니다! 🎉 서비스가 정상적으로 배포되었습니다.

### 관리 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml stop

# 서비스 시작
docker-compose -f docker-compose.prod.yml start

# 완전 삭제 (주의!)
docker-compose -f docker-compose.prod.yml down -v
```

### 모니터링

```bash
# 컨테이너 상태
docker ps

# 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

### 인증서 자동 갱신

Certbot이 자동으로 갱신을 시도합니다.
수동 갱신:
```bash
docker-compose -f docker-compose.prod.yml stop nginx
certbot renew
docker-compose -f docker-compose.prod.yml start nginx
```

---

## 🆘 문제 해결

### 서비스가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs backend

# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart backend
```

### 방화벽 문제

```bash
# 방화벽 상태 확인
firewall-cmd --list-all

# 포트 열기
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

### DNS 문제

```bash
# DNS 확인
nslookup 기후동행.site

# hosts 파일에 임시 추가 (테스트용)
echo "xxx.xxx.xxx.xxx 기후동행.site" >> /etc/hosts
```

---

**다음 단계**:
- `SECURITY.md` - 보안 점검
- `DEPLOYMENT.md` - 상세 배포 가이드
- Sentry 대시보드에서 에러 모니터링
