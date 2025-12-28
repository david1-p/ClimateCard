# 🚀 Locust 부하 테스트 가이드

## 📋 개요

Locust를 사용하여 기후동행카드 조회 시스템의 성능과 안정성을 테스트합니다.

---

## 🛠️ 실행 방법

### **Option 1: Docker Compose 사용 (권장)**

```bash
# 1. Backend 서버 시작
docker-compose --profile prod up -d backend

# 2. Locust 시작
docker-compose --profile loadtest up

# 3. 웹 브라우저에서 접속
open http://localhost:8089

# 4. 테스트 설정
# - Number of users: 100 (동시 사용자 수)
# - Spawn rate: 10 (초당 증가하는 사용자 수)
# - Host: http://backend:8080 (자동 설정됨)

# 5. Start swarming 클릭

# 6. 테스트 종료
docker-compose --profile loadtest down
```

### **Option 2: 로컬 Python 환경**

```bash
# 1. Locust 설치
pip install locust

# 2. Backend 서버 시작
cd backend
./gradlew bootRun

# 3. Locust 실행
cd loadtest
locust -f locustfile.py --host=http://localhost:8080

# 4. 웹 브라우저에서 접속
open http://localhost:8089
```

---

## 📊 테스트 시나리오

### **1. ClimateCardUser (일반 사용자 시뮬레이션)**

실제 사용자 행동 패턴을 시뮬레이션합니다.

| API 엔드포인트 | 가중치 | 설명 |
|---------------|--------|------|
| `GET /api/stations/nearby` | 10 (50%) | 주변 정류소 조회 |
| `GET /api/routes/search` | 5 (25%) | 노선 검색 |
| `GET /api/stations/{id}/routes` | 3 (15%) | 정류소 노선 조회 |
| `GET /api/routes/{id}` | 2 (10%) | 노선 상세 조회 |
| `GET /api/routes/station/{id}/climate-eligible` | 1 (5%) | 기후동행카드 노선만 조회 |

**대기 시간**: 1~5초

### **2. HealthCheckUser (모니터링 시뮬레이션)**

헬스체크 엔드포인트를 주기적으로 호출합니다.

| API 엔드포인트 | 가중치 | 설명 |
|---------------|--------|------|
| `GET /actuator/health` | 1 | 헬스체크 |

**대기 시간**: 5~10초

### **3. HeavyLoadUser (고부하 시뮬레이션)**

출퇴근 시간대의 높은 트래픽을 시뮬레이션합니다.

| API 엔드포인트 | 가중치 | 설명 |
|---------------|--------|------|
| `GET /api/stations/nearby` (서울역 고정) | 1 | 캐싱 효과 테스트 |

**대기 시간**: 0.1~0.5초

---

## 🎯 권장 테스트 시나리오

### **시나리오 1: 기본 성능 테스트**

**목적**: 정상 트래픽 처리 능력 확인

```
Users: 50
Spawn rate: 5
Duration: 5분
```

**기대 결과**:
- 평균 응답 시간: < 100ms
- 95 percentile: < 200ms
- 실패율: < 1%

---

### **시나리오 2: 스트레스 테스트**

**목적**: 시스템 한계 찾기

```
Users: 100 → 500 (점진적 증가)
Spawn rate: 10
Duration: 10분
```

**확인 사항**:
- 어느 시점에서 응답 시간이 급증하는지
- 시스템 리소스(CPU, 메모리) 사용량
- Redis 캐싱 효과

---

### **시나리오 3: 스파이크 테스트**

**목적**: 급격한 트래픽 증가 대응력 확인

```
Users: 10 → 500 → 10 (급격한 변화)
Spawn rate: 50
Duration: 5분
```

---

### **시나리오 4: 지속성 테스트**

**목적**: 장시간 안정성 확인

```
Users: 100
Spawn rate: 10
Duration: 30분 ~ 1시간
```

**확인 사항**:
- 메모리 누수
- Connection 누수
- 성능 저하 여부

---

## 📈 결과 분석

### **주요 지표**

1. **응답 시간 (Response Time)**
   - 평균 (Average)
   - 중간값 (Median)
   - 95 percentile
   - 99 percentile
   - 최대값 (Max)

2. **처리량 (Throughput)**
   - RPS (Requests Per Second)
   - 총 요청 수

3. **에러율 (Error Rate)**
   - 실패한 요청 비율
   - HTTP 상태 코드별 분포

4. **동시 사용자 수 (Concurrent Users)**
   - 현재 활성 사용자 수

### **성능 목표**

| 지표 | 목표 | 현재 상태 |
|------|------|-----------|
| 평균 응답 시간 | < 50ms | ✅ 13-18ms |
| 95 percentile | < 100ms | ? |
| 처리량 (RPS) | > 100 | ? |
| 에러율 | < 1% | ? |
| 동시 사용자 | > 100 | ? |

---

## 🔍 병목 지점 파악

### **1. 응답 시간이 느린 경우**

**확인 사항**:
- PostgreSQL 쿼리 성능 (`EXPLAIN ANALYZE`)
- Redis 캐싱 적중률
- Network latency

**해결 방법**:
- 인덱스 추가
- 쿼리 최적화
- 캐싱 전략 개선

### **2. 에러율이 높은 경우**

**확인 사항**:
- DB Connection Pool 부족
- 메모리 부족 (OOM)
- Timeout 설정

**해결 방법**:
- Connection Pool 크기 증가
- 메모리 할당 증가
- Timeout 값 조정

### **3. 처리량이 낮은 경우**

**확인 사항**:
- CPU 사용률
- Thread Pool 크기
- I/O 대기

**해결 방법**:
- 수평 확장 (Scale Out)
- 수직 확장 (Scale Up)
- 비동기 처리 도입

---

## 💡 팁

1. **점진적으로 부하 증가**
   - 갑작스러운 부하로 서버가 다운되지 않도록 주의

2. **실제 프로덕션 환경과 유사하게**
   - 동일한 서버 스펙
   - 동일한 DB 크기
   - 동일한 네트워크 환경

3. **모니터링 도구와 함께 사용**
   - Grafana + Prometheus
   - Spring Boot Actuator
   - PostgreSQL 모니터링

4. **캐싱 효과 확인**
   - Redis 캐시 hit/miss 비율
   - 반복 요청 시 응답 시간 변화

---

## 🚨 주의사항

1. **프로덕션 환경에서 직접 테스트 금지**
   - 반드시 별도의 테스트 환경 사용

2. **API 키 관리**
   - 외부 API 호출 제한 확인
   - 테스트용 API 키 사용

3. **DB 백업**
   - 테스트 전 DB 백업
   - 필요 시 복구 가능하도록 준비

---

## 📝 보고서 생성

테스트 완료 후 웹 UI에서 "Download Data" 클릭:
- CSV 형식으로 결과 다운로드
- 차트 이미지 저장
- 보고서 작성

---

## 🔗 참고 자료

- [Locust 공식 문서](https://docs.locust.io/)
- [Locust GitHub](https://github.com/locustio/locust)
- [성능 테스트 Best Practices](https://docs.locust.io/en/stable/writing-a-locustfile.html)
