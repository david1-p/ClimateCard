# 🗄️ 데이터베이스 무료 옵션 가이드

## 📊 현재 상황

**서버 스펙**: Vultr 1GB RAM
**문제**: PostgreSQL이 256MB 메모리 사용 → 다른 서비스 압박

---

## ✅ 추천: Neon PostgreSQL 무료 사용

### 1️⃣ Neon 계정 생성 (1분)

1. https://neon.tech 접속
2. **Sign Up** 클릭
3. GitHub 계정으로 로그인 (또는 이메일)

### 2️⃣ 프로젝트 생성 (2분)

1. **Create a project** 클릭
2. 프로젝트 설정:
   ```
   Project name: climate-transport
   Region: Asia Pacific (Singapore) - 가장 가까운 지역
   PostgreSQL version: 16
   ```
3. **Create project** 클릭

### 3️⃣ PostGIS 확장 활성화 (1분)

프로젝트 생성 후 SQL Editor에서 실행:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 확인
SELECT PostGIS_version();
```

### 4️⃣ 연결 정보 복사

Dashboard에서 **Connection string** 복사:

```
postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 5️⃣ 프로젝트 설정 변경

**`.env` 파일 수정**:

```bash
# 기존 (로컬 PostgreSQL)
# DB_NAME=climate_transport
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432

# 새로운 (Neon PostgreSQL) - 한 줄로!
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**`docker-compose.prod.yml` 수정**:

```yaml
services:
  # PostgreSQL 주석 처리 (더 이상 필요 없음)
  # postgres:
  #   image: postgis/postgis:16-3.4
  #   ...

  backend:
    environment:
      # 기존 설정 대신 DATABASE_URL 사용
      SPRING_DATASOURCE_URL: ${DATABASE_URL}
      # DB_USERNAME, DB_PASSWORD는 제거 (DATABASE_URL에 포함됨)
```

### 6️⃣ 배포

```bash
cd /opt/climate-transport

# 환경 변수 적용
source .env

# PostgreSQL 컨테이너 없이 실행
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 💰 메모리 절약 효과

| 항목 | 이전 | 이후 | 절약 |
|------|------|------|------|
| PostgreSQL | 256MB | 0MB | ✅ 256MB |
| Backend | 512MB | 512MB | - |
| Redis | 128MB | 128MB | - |
| Nginx | 64MB | 64MB | - |
| **총 사용** | **960MB** | **704MB** | **✅ 256MB 절약** |
| **여유 메모리** | **40MB** | **296MB** | **🎉 7배 증가!** |

---

## 📋 Neon 무료 티어 제한

| 항목 | 제한 | 충분한가? |
|------|------|-----------|
| 스토리지 | 512MB | ✅ 충분 (노선 데이터는 작음) |
| 데이터 전송 | 무제한 | ✅ 완벽 |
| 연결 수 | 무제한 | ✅ 완벽 |
| 사용 기간 | 영구 무료 | ✅ 완벽 |

**결론**: 이 프로젝트에는 충분합니다!

---

## 🔄 대안 옵션

### Supabase PostgreSQL

**장점**:
- PostGIS 지원
- 무료 500MB
- 자동 백업
- REST API 자동 생성

**설정 방법**:

1. https://supabase.com 가입
2. New Project 생성
3. Settings → Database 에서 Connection string 복사
4. `.env`에 `DATABASE_URL` 설정

---

## ❌ MongoDB Atlas는 왜 안 되나?

### 문제점

1. **PostGIS 기능 손실**
   - 현재 코드는 PostGIS 의존
   - "주변 정류소 찾기" 기능 사용 중
   - MongoDB는 지리공간 쿼리가 약함

2. **대대적인 코드 수정 필요**
   ```java
   // 수정 필요한 파일들
   backend/src/main/java/com/climate/transport/
   ├── entity/           (모든 Entity 수정)
   ├── repository/       (모든 Repository 수정)
   ├── service/          (쿼리 메서드 수정)
   └── config/           (JPA → MongoDB 설정)
   ```
   **예상 작업 시간**: 2-3일
   **난이도**: ⭐⭐⭐⭐⭐ (매우 어려움)

3. **MongoDB Atlas 무료 티어 제한**
   - 512MB 스토리지만
   - 공유 RAM (느림)
   - 지리공간 인덱스 제한

---

## 🎯 최종 추천

### 1순위: Neon PostgreSQL ⭐⭐⭐⭐⭐

```bash
✅ 메모리 256MB 절약
✅ 코드 수정 거의 없음 (5분)
✅ PostGIS 완벽 지원
✅ 무료 영구 사용
```

### 2순위: Supabase PostgreSQL ⭐⭐⭐⭐

```bash
✅ 메모리 256MB 절약
✅ 코드 수정 거의 없음
✅ PostGIS 완벽 지원
✅ REST API 자동 생성 (보너스)
```

### 3순위: 현재 로컬 PostgreSQL ⭐⭐⭐

```bash
⚠️ 메모리 부족 (40MB 여유)
✅ 코드 수정 없음
✅ 완전한 제어 가능
```

---

## 🚀 빠른 시작: Neon으로 전환 (5분)

### 단계별 가이드

```bash
# 1. Neon 가입 (1분)
https://neon.tech → Sign Up

# 2. 프로젝트 생성 (1분)
Create Project → climate-transport

# 3. PostGIS 활성화 (1분)
SQL Editor → CREATE EXTENSION postgis;

# 4. 연결 문자열 복사 (30초)
Dashboard → Connection string 복사

# 5. .env 파일 수정 (1분)
DATABASE_URL=postgresql://...

# 6. docker-compose.prod.yml 수정 (1분)
postgres: 부분 주석 처리

# 7. 재배포 (30초)
docker-compose -f docker-compose.prod.yml up -d --build
```

**총 소요 시간**: 5분
**메모리 절약**: 256MB
**코드 수정**: 거의 없음

---

## 💡 참고: 로컬 테스트

Neon으로 전환 후에도 로컬 개발은 Docker PostgreSQL 사용 가능:

```bash
# 로컬 개발 (.env.local)
DB_HOST=localhost
DB_PORT=5432

# 프로덕션 (.env)
DATABASE_URL=postgresql://neon...
```

---

## 📞 도움말

- Neon 문서: https://neon.tech/docs
- Supabase 문서: https://supabase.com/docs
- PostGIS 문서: https://postgis.net/documentation/

**질문이 있으면 언제든지 물어보세요!**
