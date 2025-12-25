# 🚀 프로덕션 배포 가이드

## 📋 배포 전 체크리스트

- [x] npm audit (취약점 0개)
- [x] OWASP Dependency Check 설정
- [x] 보안 헤더 설정
- [x] Rate Limiting 구현
- [x] API Key 인증
- [ ] HTTPS 인증서 발급
- [ ] 프로덕션 환경 변수 설정
- [ ] Docker 배포

---

## 1. 🔐 HTTPS 인증서 발급 (Let's Encrypt)

### 1-1. 사전 준비

**도메인 설정**
- 도메인: `기후동행.site` (예시)
- DNS A 레코드: Vultr 서버 IP로 설정
- www 서브도메인도 설정 권장

**서버 접속**
```bash
ssh root@<Vultr_서버_IP>
```

### 1-2. Certbot 설치

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### 1-3. 인증서 발급 (Standalone 모드)

**첫 발급 시 (서비스가 아직 실행 중이 아닐 때)**

```bash
# 80 포트 사용 중인 서비스 중지
sudo systemctl stop nginx

# Let's Encrypt 인증서 발급
sudo certbot certonly --standalone \
  -d 기후동행.site \
  -d www.기후동행.site \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# 성공 메시지
# Congratulations! Your certificate and chain have been saved at:
# /etc/letsencrypt/live/기후동행.site/fullchain.pem
# /etc/letsencrypt/live/기후동행.site/privkey.pem
```

### 1-4. 인증서 확인

```bash
sudo ls -la /etc/letsencrypt/live/기후동행.site/

# 파일 목록:
# - fullchain.pem  (인증서 + 중간 인증서)
# - privkey.pem    (개인키)
# - chain.pem      (중간 인증서)
# - cert.pem       (인증서)
```

### 1-5. 인증서 자동 갱신 설정

**Let's Encrypt 인증서는 90일마다 갱신 필요**

```bash
# 갱신 테스트 (실제 갱신 안 함)
sudo certbot renew --dry-run

# Cron으로 자동 갱신 설정 (매일 새벽 2시)
sudo crontab -e

# 아래 라인 추가:
0 2 * * * certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

**Docker Compose 사용 시**
- `docker-compose.prod.yml`에 이미 certbot 서비스 포함됨
- 12시간마다 자동으로 갱신 체크

---

## 2. 🐳 Docker 배포

### 2-1. 서버에 Docker 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 확인
docker --version
docker-compose --version
```

### 2-2. 프로젝트 파일 업로드

**방법 1: Git Clone**
```bash
cd /opt
sudo git clone https://github.com/your-username/climate-transport.git
cd climate-transport
```

**방법 2: SCP로 직접 업로드**
```bash
# 로컬 컴퓨터에서 실행
scp -r /Users/david/Desktop/기후동행 root@<Vultr_IP>:/opt/climate-transport
```

### 2-3. 프로덕션 환경 변수 설정

```bash
cd /opt/climate-transport

# .env 파일 생성
sudo nano .env
```

**.env 파일 내용 (프로덕션용)**
```bash
# Database
DB_NAME=climate_transport
DB_USERNAME=postgres
DB_PASSWORD=<강력한_비밀번호_생성>  # 절대 1q2w 사용 금지!

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API Keys
PUBLIC_API_SERVICE_KEY=<공공데이터포털_키>
SEOUL_API_KEY=<서울_열린데이터광장_키>

# Admin API Key (반드시 새로 생성!)
ADMIN_API_KEY=<새로운_강력한_키>

# Sentry
SENTRY_DSN=<Sentry_DSN>

# Profile
PROFILE=prod
```

**강력한 비밀번호 생성**
```bash
# DB 비밀번호
openssl rand -base64 32

# Admin API Key
openssl rand -base64 32
```

### 2-4. 프론트엔드 빌드

```bash
cd frontend

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# dist 폴더 확인
ls -la dist/
```

### 2-5. Docker Compose 실행

```bash
cd /opt/climate-transport

# 빌드 및 실행
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
sudo docker-compose -f docker-compose.prod.yml logs -f

# 서비스 상태 확인
sudo docker-compose -f docker-compose.prod.yml ps
```

---

## 3. 🔍 배포 후 검증

### 3-1. 헬스체크

```bash
# Backend Health
curl http://localhost:8080/actuator/health

# HTTPS 확인
curl -I https://기후동행.site

# API 테스트
curl https://기후동행.site/api/routes/search?keyword=421
```

### 3-2. 보안 헤더 확인

```bash
curl -I https://기후동행.site | grep -E 'Strict-Transport|X-Frame|X-Content-Type'

# 예상 결과:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

### 3-3. SSL 등급 확인

**SSL Labs 테스트**
- https://www.ssllabs.com/ssltest/
- 도메인 입력 후 분석
- 목표: A+ 등급

### 3-4. Rate Limiting 테스트

```bash
# 초당 25회 요청 (제한 초과)
for i in {1..25}; do
  curl https://기후동행.site/api/routes/search?keyword=421 &
done

# 429 Too Many Requests 응답 확인
```

---

## 4. 📊 모니터링

### 4-1. 로그 모니터링

```bash
# 전체 로그
sudo docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
sudo docker-compose -f docker-compose.prod.yml logs -f backend
sudo docker-compose -f docker-compose.prod.yml logs -f nginx

# 최근 100줄
sudo docker-compose -f docker-compose.prod.yml logs --tail=100
```

### 4-2. Sentry 대시보드
- https://sentry.io
- 실시간 에러 추적
- 성능 모니터링

---

## 5. 🔄 업데이트 및 롤백

### 5-1. 무중단 업데이트

```bash
cd /opt/climate-transport

# 코드 업데이트 (Git 사용 시)
sudo git pull origin master

# 프론트엔드 재빌드
cd frontend
npm install
npm run build

# Docker 재시작
cd ..
sudo docker-compose -f docker-compose.prod.yml up -d --build

# 기존 이미지 정리
sudo docker image prune -f
```

### 5-2. 롤백

```bash
# 이전 커밋으로 롤백
sudo git log --oneline  # 커밋 확인
sudo git reset --hard <이전_커밋_해시>

# 재배포
sudo docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 6. 🛡️ 추가 보안 설정 (선택)

### 6-1. Fail2ban (무차별 대입 공격 차단)

```bash
sudo apt install fail2ban

# Nginx 로그 기반 차단 설정
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 600
bantime = 3600
```

### 6-2. UFW (방화벽)

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

### 6-3. 자동 백업

```bash
# 백업 스크립트 생성
sudo nano /opt/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# DB 백업
docker exec climate-transport-db pg_dump -U postgres climate_transport > $BACKUP_DIR/db_$DATE.sql

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
# 실행 권한
sudo chmod +x /opt/backup.sh

# Cron 설정 (매일 새벽 3시)
sudo crontab -e
0 3 * * * /opt/backup.sh
```

---

## 7. ❗ 트러블슈팅

### 7-1. 인증서 발급 실패

**문제**: `Failed to renew certificate`

**해결**:
```bash
# 80번 포트 사용 중인 프로세스 확인
sudo lsof -i :80

# Docker 중지 후 재시도
sudo docker-compose -f docker-compose.prod.yml stop nginx
sudo certbot renew
sudo docker-compose -f docker-compose.prod.yml start nginx
```

### 7-2. HSTS 경고

**문제**: 브라우저에서 HSTS 관련 경고

**해결**:
- HSTS는 첫 방문 시 적용되지 않음 (정상)
- 두 번째 방문부터 HTTPS 강제
- Chrome에서 확인: `chrome://net-internals/#hsts`

### 7-3. Docker 컨테이너 재시작 반복

**문제**: 컨테이너가 계속 재시작됨

**해결**:
```bash
# 로그 확인
sudo docker-compose -f docker-compose.prod.yml logs backend

# 일반적인 원인:
# 1. DB 연결 실패 -> .env 확인
# 2. 메모리 부족 -> docker stats 확인
# 3. 포트 충돌 -> lsof -i :8080 확인
```

---

## 📞 지원

- **GitHub Issues**: https://github.com/your-repo/issues
- **Email**: your-email@example.com
- **Sentry**: https://sentry.io (에러 자동 추적)

---

## ✅ 최종 체크리스트

배포 완료 전 반드시 확인:

- [ ] HTTPS 인증서 발급 완료
- [ ] SSL Labs A+ 등급 획득
- [ ] 보안 헤더 모두 설정됨
- [ ] Rate Limiting 동작 확인
- [ ] Admin API Key 재생성 (개발 키 사용 금지)
- [ ] DB 비밀번호 변경 (1q2w 사용 금지)
- [ ] Sentry 에러 추적 동작 확인
- [ ] 백업 자동화 설정
- [ ] 모니터링 대시보드 확인
- [ ] 도메인 DNS 설정 완료

**프로덕션 배포 후 SECURITY.md 보안 등급: A+** 🎉
