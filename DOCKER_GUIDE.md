# Docker Compose 사용 가이드

통합된 `docker-compose.yml` 파일과 하나의 `.env` 파일로 모든 환경을 관리합니다.

## 🎯 핵심 개념

**단일 `.env` 파일 사용:**
- `.env` 파일 하나로 모든 환경 관리
- `COMPOSE_PROFILES` 변수로 환경 선택 (dev, prod, neon)
- 환경 전환 시 `.env` 파일만 수정

---

## 📋 환경별 프로필

### 1. 개발 환경 (dev)
로컬 개발용 - PostgreSQL + Redis만 실행

```bash
# .env 파일에서 COMPOSE_PROFILES 설정
COMPOSE_PROFILES=dev

# 실행
docker-compose --profile dev up -d

# 종료
docker-compose --profile dev down
```

**실행되는 서비스:**
- PostgreSQL (로컬)
- Redis

**백엔드/프론트엔드는 로컬에서 직접 실행:**
```bash
# 백엔드
cd backend
./gradlew bootRun

# 프론트엔드
cd frontend
npm run dev
```

**메모리 사용량:**
- PostgreSQL: 512MB
- Redis: 256MB
- **총합: ~768MB**

---

### 2. 프로덕션 환경 (prod)
자체 PostgreSQL 호스팅 - 모든 서비스 Docker로 실행

```bash
# .env 파일 수정
COMPOSE_PROFILES=prod
DB_PASSWORD=강력한_비밀번호  # 반드시 변경!
REDIS_MAX_MEMORY=100mb
POSTGRES_MEMORY_LIMIT=256M
SPRING_PROFILE=prod
# API 키들도 실제 값으로 설정

# 프론트엔드 빌드
cd frontend
npm run build
cd ..

# 백엔드 빌드 & 전체 실행
docker-compose --profile prod up -d --build

# 로그 확인
docker-compose logs -f

# 종료
docker-compose --profile prod down
```

**실행되는 서비스:**
- PostgreSQL (Docker)
- Redis (Docker)
- Backend (Docker)
- Nginx (Docker)
- Certbot (Docker)

**메모리 사용량:**
- PostgreSQL: 256MB
- Redis: 128MB
- Backend: 512MB
- Nginx: 64MB
- **총합: ~960MB**

---

### 3. Neon DB 환경 (neon)
Neon 클라우드 PostgreSQL 사용 - PostgreSQL 제외 모든 서비스 실행

```bash
# .env 파일 수정
COMPOSE_PROFILES=neon
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/db?sslmode=require
REDIS_MAX_MEMORY=100mb
SPRING_PROFILE=prod
# API 키들도 실제 값으로 설정

# 프론트엔드 빌드
cd frontend
npm run build
cd ..

# 백엔드 빌드 & 실행
docker-compose --profile neon up -d --build

# 로그 확인
docker-compose logs -f

# 종료
docker-compose --profile neon down
```

**실행되는 서비스:**
- Redis (Docker)
- Backend (Docker)
- Nginx (Docker)
- Certbot (Docker)

**PostgreSQL:** Neon 클라우드 사용 (256MB 메모리 절약)

**메모리 사용량:**
- Redis: 128MB
- Backend: 512MB
- Nginx: 64MB
- **총합: ~704MB**

---

## 🔧 유용한 명령어

### 서비스 상태 확인
```bash
docker-compose ps
```

### 특정 서비스 재시작
```bash
docker-compose restart backend
docker-compose restart nginx
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 볼륨 삭제 (데이터 초기화)
```bash
# 주의: 모든 데이터가 삭제됩니다!
docker-compose down -v
```

### 이미지 재빌드
```bash
docker-compose --profile prod build --no-cache
```

---

## 📝 환경 전환 가이드

### 개발 → 프로덕션
```bash
# 1. 현재 개발 환경 종료
docker-compose --profile dev down

# 2. .env 파일 수정
# COMPOSE_PROFILES=dev → COMPOSE_PROFILES=prod
# DB_PASSWORD, API 키들 실제 값으로 변경

# 3. 프론트엔드 빌드
cd frontend && npm run build && cd ..

# 4. 프로덕션 환경 실행
docker-compose --profile prod up -d --build
```

### 프로덕션 → Neon DB
```bash
# 1. 현재 프로덕션 환경 종료
docker-compose --profile prod down

# 2. .env 파일 수정
# COMPOSE_PROFILES=prod → COMPOSE_PROFILES=neon
# DATABASE_URL 추가 (Neon 연결 문자열)

# 3. Neon 환경 실행
docker-compose --profile neon up -d --build
```

---

## ⚠️ 주의사항

### 1. 프로필 지정 필수
프로필을 지정하지 않으면 아무 서비스도 실행되지 않습니다.

```bash
# ❌ 잘못된 사용
docker-compose up -d

# ✅ 올바른 사용
docker-compose --profile dev up -d
```

### 2. 환경변수 설정
`.env` 파일에서 반드시 설정해야 하는 항목:
- `COMPOSE_PROFILES`: 환경 선택 (dev/prod/neon)
- `DB_PASSWORD`: 데이터베이스 비밀번호
- `PUBLIC_API_SERVICE_KEY`: 공공데이터포털 API 키
- `SEOUL_API_KEY`: 서울 열린데이터광장 API 키
- `ADMIN_API_KEY`: 관리자 API 키

### 3. 프론트엔드 빌드
prod/neon 환경에서는 `frontend/dist` 디렉토리가 필요합니다.

```bash
cd frontend
npm run build
cd ..
```

### 4. 포트 충돌
로컬에서 PostgreSQL/Redis가 이미 실행 중이면 포트 충돌이 발생할 수 있습니다.

### 5. 보안
- `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- 프로덕션 환경에서는 강력한 비밀번호 사용
- API 키는 절대 공유하지 마세요

---

## 🚀 빠른 시작

### 처음 시작하기
```bash
# 1. 템플릿 복사
cp .env.example .env

# 2. .env 파일 편집
# - COMPOSE_PROFILES=dev
# - DB_PASSWORD 설정
# - API 키들 설정

# 3. 개발 환경 실행
docker-compose --profile dev up -d

# 4. 로컬에서 백엔드/프론트엔드 실행
cd backend && ./gradlew bootRun
cd frontend && npm run dev
```

### 프로덕션 배포
```bash
# 1. .env 파일에서 COMPOSE_PROFILES=prod 설정
# 2. 모든 환경변수를 프로덕션 값으로 변경
# 3. 프론트엔드 빌드
cd frontend && npm run build && cd ..

# 4. 전체 스택 배포
docker-compose --profile prod up -d --build
```

### Neon DB 배포 (메모리 절약)
```bash
# 1. .env 파일에서 COMPOSE_PROFILES=neon 설정
# 2. DATABASE_URL에 Neon 연결 문자열 설정
# 3. 프론트엔드 빌드
cd frontend && npm run build && cd ..

# 4. 배포 (PostgreSQL 제외)
docker-compose --profile neon up -d --build
```

---

## 🔍 트러블슈팅

### 서비스가 실행되지 않을 때
```bash
# 프로필 확인
echo $COMPOSE_PROFILES

# .env 파일 확인
cat .env | grep COMPOSE_PROFILES

# 로그 확인
docker-compose logs -f
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :8080  # Backend
```

### 컨테이너 완전 초기화
```bash
docker-compose down -v
docker system prune -a
```
