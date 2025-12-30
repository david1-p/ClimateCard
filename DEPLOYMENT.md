# Vultr 서버 배포 가이드

기후동행카드 조회 시스템을 Vultr 서버에 배포하는 전체 과정을 안내합니다.

## 📋 목차
1. [사전 준비](#사전-준비)
2. [Vultr 서버 설정](#vultr-서버-설정)
3. [서버 환경 구성](#서버-환경-구성)
4. [프로젝트 배포](#프로젝트-배포)
5. [SSL 인증서 설정](#ssl-인증서-설정)
6. [운영 및 모니터링](#운영-및-모니터링)

---

## 사전 준비

### 필요한 것들
- Vultr 계정
- 공공 데이터 포털 API 키
- 서울시 Open API 키
- 카카오 JavaScript 앱 키
- 도메인 (선택 - SSL 사용 시)

### 권장 서버 사양
- 최소: 1 vCPU, 2GB RAM, 50GB SSD
- 권장: 2 vCPU, 4GB RAM, 80GB SSD
- OS: Ubuntu 22.04 LTS

---

## Vultr 서버 설정

### 1. 인스턴스 생성

1. Vultr 콘솔 로그인
2. Deploy New Server 클릭
3. Server Type: Cloud Compute
4. Location: Seoul
5. Image: Ubuntu 22.04 LTS
6. Plan: 2GB RAM 이상
7. Deploy Now

### 2. SSH 접속

```bash
ssh root@your-server-ip
```

---

## 서버 환경 구성

### 1. 시스템 업데이트

```bash
apt update && apt upgrade -y
timedatectl set-timezone Asia/Seoul
```

### 2. Docker 설치

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y
systemctl start docker
systemctl enable docker
```

### 3. Git 설치

```bash
apt install git -y
```

### 4. 방화벽 설정

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 프로젝트 배포

### 1. 프로젝트 클론

```bash
cd /opt
git clone https://github.com/david1-p/ClimateCard.git
cd ClimateCard
```

### 2. 환경 변수 설정

```bash
cp .env.production.example .env.production
nano .env.production
```

필수 환경 변수:
- DB_PASSWORD (강력한 비밀번호)
- PUBLIC_API_SERVICE_KEY
- SEOUL_API_KEY
- ADMIN_API_KEY
- VITE_KAKAO_APP_KEY

### 3. 배포

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. 확인

```bash
docker-compose --profile prod ps
curl http://localhost/api/actuator/health
```

---

## SSL 인증서 설정

### 1. 도메인 DNS 설정

```
A 레코드: your-domain.com → server-ip
```

### 2. nginx.conf 수정

```bash
nano nginx.conf
# server_name 변경
```

### 3. 인증서 발급

```bash
docker-compose --profile prod run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d your-domain.com -d www.your-domain.com \
  --email your@email.com --agree-tos
```

---

## 운영 및 모니터링

```bash
# 로그 확인
docker-compose --profile prod logs -f

# 재시작
docker-compose --profile prod restart

# 백업
docker exec climate-postgres pg_dump -U postgres climate_transport > backup.sql
```

---

## 문제 해결

### 백엔드 시작 실패
```bash
docker-compose --profile prod logs backend
```

### 메모리 부족
```bash
docker stats
# .env.production에서 메모리 제한 조정
```

---

## 지원

- GitHub: https://github.com/david1-p/ClimateCard
- 카카오톡: https://open.kakao.com/o/sMFxZ48h
