# 🚀 기후동행.site 배포 가이드 (최종 완성판)

**서버**: Vultr 1GB RAM (CentOS/Rocky Linux)
**도메인**: 기후동행.site
**데이터베이스**: Neon PostgreSQL (무료)
**예상 시간**: 30분

---

## 📋 배포 전 체크리스트

- [ ] Vultr 서버 생성 완료
- [ ] 도메인 구매 완료 (기후동행.site)
- [ ] Neon 계정 생성
- [ ] 로컬에 프로젝트 준비

---

## 1️⃣ Neon PostgreSQL 설정 (5분)

### 1-1. Neon 가입

1. https://neon.tech 접속
2. **Sign Up** 클릭
3. **Continue with GitHub** (또는 이메일)

### 1-2. 프로젝트 생성

1. **Create a project** 클릭
2. 설정:
   ```
   Project name: climate-transport
   Region: Asia Pacific (Singapore)  ← 한국에서 가장 가까움
   PostgreSQL version: 16
   ```
3. **Create project** 클릭

### 1-3. PostGIS 확장 활성화

**SQL Editor** 클릭 후 다음 쿼리 실행:

```sql
-- PostGIS 확장 설치
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 확인
SELECT PostGIS_version();
```

**결과**: `3.4 USE_GEOS=1 ...` 표시되면 성공!

### 1-4. Connection String 복사

1. **Dashboard** 클릭
2. **Connection Details** 섹션 확인
3. **Connection string** 복사 (전체!)

예시:
```
postgresql://climate_user:AbC123XyZ@ep-cool-cloud-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**⚠️ 주의**: 이 문자열을 안전하게 보관하세요!

---

## 2️⃣ 도메인 DNS 설정 (5분)

### Vultr 서버 IP 확인

Vultr 대시보드에서 서버 IP 확인 (예: `123.456.789.0`)

### DNS 레코드 추가

도메인 등록 업체 (가비아, 호스팅케이알 등)에서:

| 타입 | 호스트 | 값 (IP) | TTL |
|------|--------|---------|-----|
| A | @ | 123.456.789.0 | 600 |
| A | www | 123.456.789.0 | 600 |

**확인 방법** (로컬 컴퓨터에서):
```bash
nslookup 기후동행.site

# Vultr IP가 나오면 성공!
# DNS 전파에 10분~1시간 소요
```

---

## 3️⃣ Vultr 서버 접속 및 초기 설정 (10분)

### 3-1. SSH 접속

```bash
# Mac/Linux
ssh root@123.456.789.0

# 비밀번호 입력 (Vultr에서 제공)
```

**Windows**: PowerShell 또는 PuTTY 사용

### 3-2. 루트 비밀번호 변경 (보안!)

```bash
passwd
# 새 비밀번호 입력
# 비밀번호 재확인
```

### 3-3. 서버 초기 설정 스크립트 다운로드

```bash
# Git 설치
dnf install -y git

# 임시 디렉토리에서 스크립트 다운로드
cd /tmp
curl -O https://raw.githubusercontent.com/your-repo/climate-transport/main/server-init.sh

# 또는 직접 생성
nano server-init.sh
```

**스크립트 내용 붙여넣기** (프로젝트의 `server-init.sh` 파일)

```bash
chmod +x server-init.sh
./server-init.sh
```

**실행 시간**: 약 5-10분
**설치되는 것**: Docker, Docker Compose, Node.js, Certbot, 방화벽 설정 등

---

## 4️⃣ 프로젝트 업로드 (5분)

### 방법 1: Git Clone (권장)

**GitHub에 푸시 (로컬에서)**:
```bash
cd /Users/david/Desktop/기후동행

git add .
git commit -m "Production deployment ready"
git push origin master
```

**서버에서 클론**:
```bash
cd /opt
git clone https://github.com/your-username/climate-transport.git
cd climate-transport
```

### 방법 2: SCP 직접 업로드

**로컬 컴퓨터에서**:
```bash
scp -r /Users/david/Desktop/기후동행 root@123.456.789.0:/opt/

# 진행 상황 표시
# 완료되면 서버에 접속
ssh root@123.456.789.0
cd /opt/기후동행
```

---

## 5️⃣ 환경 변수 설정 (3분)

### 5-1. .env 파일 생성

```bash
cd /opt/climate-transport

# 템플릿 복사
cp .env.neon.template .env

# 편집
nano .env
```

### 5-2. .env 파일 내용 작성

```bash
# Neon PostgreSQL (Step 1에서 복사한 Connection string)
DATABASE_URL=postgresql://climate_user:AbC123XyZ@ep-cool-cloud-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Redis (자동 설정)
REDIS_HOST=redis
REDIS_PORT=6379

# 공공데이터포털 API 키
# https://www.data.go.kr 에서 발급
PUBLIC_API_SERVICE_KEY=your_actual_key_here

# 서울 열린데이터광장 API 키
# https://data.seoul.go.kr 에서 발급
SEOUL_API_KEY=your_actual_key_here

# Admin API Key (강력한 랜덤 키 생성)
# 생성 명령: openssl rand -base64 32
ADMIN_API_KEY=생성된_랜덤_키_붙여넣기

# Sentry (선택)
SENTRY_DSN=https://...@sentry.io/...

# Profile
PROFILE=prod
```

**저장**: Ctrl + O, Enter, Ctrl + X

### 5-3. 강력한 API Key 생성

```bash
openssl rand -base64 32

# 출력 예시: nR8tY5uI2oP9aS6dF3gH7jK4lM1qW0eR
# 이 값을 ADMIN_API_KEY에 복사
```

---

## 6️⃣ 프론트엔드 빌드 (3분)

```bash
cd /opt/climate-transport/frontend

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# dist 폴더 확인
ls -la dist/
```

**성공 메시지**:
```
vite v7.x.x building for production...
✓ x modules transformed.
dist/index.html  x.xx kB
✅ built in x.xxs
```

---

## 7️⃣ Docker Compose 실행 (2분)

```bash
cd /opt/climate-transport

# Neon 버전으로 서비스 시작
docker-compose -f docker-compose.neon.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.neon.yml logs -f
```

**성공 메시지**:
```
✅ Container climate-transport-redis     Started
✅ Container climate-transport-backend   Started
✅ Container climate-transport-nginx     Started
✅ Container climate-transport-certbot   Started
```

**서비스 상태 확인**:
```bash
docker-compose -f docker-compose.neon.yml ps

# 모든 서비스가 "Up" 상태여야 함
```

---

## 8️⃣ HTTPS 인증서 발급 (2분)

### 8-1. Nginx 임시 중지

```bash
docker-compose -f docker-compose.neon.yml stop nginx
```

### 8-2. Certbot으로 인증서 발급

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

### 8-3. Nginx 재시작

```bash
docker-compose -f docker-compose.neon.yml start nginx

# 전체 로그 확인
docker-compose -f docker-compose.neon.yml logs -f
```

---

## 9️⃣ 배포 검증 (3분)

### 9-1. HTTP/HTTPS 접속 테스트

```bash
# HTTP (자동으로 HTTPS로 리다이렉트됨)
curl -I http://기후동행.site

# HTTPS
curl -I https://기후동행.site
```

**예상 결과**:
```
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
```

### 9-2. API 테스트

```bash
curl https://기후동행.site/api/routes/search?keyword=421

# JSON 응답이 오면 성공!
```

### 9-3. 브라우저 접속

```
https://기후동행.site
```

**확인사항**:
- ✅ 페이지가 로드됨
- ✅ HTTPS 자물쇠 아이콘 표시
- ✅ 지도가 정상 표시
- ✅ 검색 기능 동작

### 9-4. SSL 등급 확인

https://www.ssllabs.com/ssltest/

- 도메인 입력: `기후동행.site`
- **목표**: A+ 등급

---

## 🔟 메모리 사용량 확인

```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 예상 메모리 사용:
# Backend:  ~400MB
# Redis:    ~80MB
# Nginx:    ~20MB
# Total:    ~500MB (1GB 중 절반만 사용!)
```

**Neon 사용 효과**:
- PostgreSQL 메모리 256MB 절약
- 여유 메모리: ~500MB (충분!)

---

## ✅ 배포 완료!

축하합니다! 🎉 서비스가 정상적으로 배포되었습니다.

### 📊 최종 확인

| 항목 | 상태 |
|------|------|
| 도메인 접속 | ✅ https://기후동행.site |
| HTTPS 인증서 | ✅ A+ 등급 |
| API 동작 | ✅ 정상 |
| 메모리 사용 | ✅ 500MB/1GB (50%) |
| 보안 헤더 | ✅ 모두 설정됨 |
| Rate Limiting | ✅ 동작 중 |

---

## 🔧 관리 명령어

### 로그 확인
```bash
# 실시간 로그
docker-compose -f docker-compose.neon.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.neon.yml logs -f backend

# 최근 100줄
docker-compose -f docker-compose.neon.yml logs --tail=100
```

### 서비스 관리
```bash
# 재시작
docker-compose -f docker-compose.neon.yml restart

# 중지
docker-compose -f docker-compose.neon.yml stop

# 시작
docker-compose -f docker-compose.neon.yml start

# 완전 삭제 (주의!)
docker-compose -f docker-compose.neon.yml down -v
```

### 업데이트
```bash
# 코드 업데이트 (Git 사용 시)
cd /opt/climate-transport
git pull origin master

# 프론트엔드 재빌드
cd frontend
npm run build

# 서비스 재시작
cd ..
docker-compose -f docker-compose.neon.yml up -d --build
```

### 인증서 갱신
```bash
# 수동 갱신 (90일마다)
docker-compose -f docker-compose.neon.yml stop nginx
certbot renew
docker-compose -f docker-compose.neon.yml start nginx

# 자동 갱신 (이미 설정됨)
# certbot 컨테이너가 12시간마다 자동 체크
```

---

## 🆘 문제 해결

### 서비스가 시작되지 않을 때

```bash
# 로그 확인
docker-compose -f docker-compose.neon.yml logs backend

# 일반적인 원인:
# 1. Neon DATABASE_URL 오류 → .env 파일 확인
# 2. 메모리 부족 → docker stats로 확인
# 3. 포트 충돌 → lsof -i :8080 확인
```

### Neon 연결 오류

```bash
# DATABASE_URL 형식 확인
cat .env | grep DATABASE_URL

# Neon 대시보드에서 Connection string 다시 확인
# https://console.neon.tech

# 서비스 재시작
docker-compose -f docker-compose.neon.yml restart backend
```

### DNS 전파 확인

```bash
# DNS 확인
nslookup 기후동행.site

# 전파 안 되었다면 (최대 24시간 소요)
# - 임시로 IP로 접속: http://123.456.789.0
# - DNS 전파 체크: https://dnschecker.org
```

### HTTPS 인증서 발급 실패

```bash
# 80번 포트 사용 중인 프로세스 확인
lsof -i :80

# Nginx 중지 후 재시도
docker-compose -f docker-compose.neon.yml stop nginx
certbot certonly --standalone -d 기후동행.site -d www.기후동행.site
docker-compose -f docker-compose.neon.yml start nginx
```

---

## 📚 참고 문서

- **Neon 설정**: `DATABASE_OPTIONS.md`
- **보안 점검**: `SECURITY.md`
- **Vultr 서버 설정**: `VULTR_SETUP.md`
- **상세 배포 가이드**: `DEPLOYMENT.md`

---

## 🎯 다음 단계

### 모니터링 설정
- Sentry 대시보드에서 에러 확인
- Neon 대시보드에서 DB 사용량 확인

### 백업 설정
Neon은 자동 백업을 제공합니다!
- Dashboard → Backups 에서 확인

### 성능 최적화
- Redis 캐시 히트율 확인
- Slow Query 분석 (Neon 대시보드)

---

**배포 완료 시간**: 약 30분
**메모리 사용**: 500MB / 1GB (50%)
**보안 등급**: A+
**무료 사용 가능**: 영구 무료

**축하합니다! 🎉**
