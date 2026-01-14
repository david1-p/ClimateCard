# 🚀 교통카드 서비스 확장 Todo

> 마지막 업데이트: 2026-01-11

---

## Phase 1: 서울 지하철 추가

### 1.1 데이터베이스 스키마
- [ ] `stations` 테이블에 지하철 컬럼 추가
  - `line_name` (호선명: 1호선, 2호선...)
  - `transfer_lines` (환승 노선들)
- [ ] `routes` 테이블에 카드 적용 컬럼 추가
  - `k_pass_eligible` (K-패스 적용)
  - `all_card_eligible` (모두의카드 적용)
- [ ] Flyway 마이그레이션 파일 생성

### 1.2 백엔드 - 지하철 API 클라이언트
- [ ] `SubwayApiClient.java` 생성 (서울시 지하철 실시간 도착정보)
- [ ] `SubwayArrivalService.java` 생성
- [ ] `SubwaySyncService.java` 생성 (지하철역 데이터 동기화)
- [ ] DTO 클래스 생성 (`SubwayArrivalResponse.java` 등)

### 1.3 백엔드 - 기존 코드 수정
- [ ] `StationService.java` - 주변 정류소 조회 시 지하철역 포함
- [ ] `StationResponse.java` - 지하철 관련 필드 추가 (호선명, 환승정보)

### 1.4 프론트엔드
- [ ] 지도 마커 아이콘 분리 (버스 🚌 / 지하철 🚇)
- [ ] 호선별 색상 적용
- [ ] 지하철 도착정보 UI (급행/일반, 상행/하행)

---

## Phase 2: 경기/인천 버스 + K-패스

### API 키 (✅ 모두 승인 완료)
```
경기도 API: 24c28d22e9b42618a3c91529223b17184f7ce4
인천 API: 148ff0c05b53284fd7738e5d3b241d132c8b81138098dcc1009f11f70d9ee16c
```

### 2.1 경기도 버스 API 클라이언트
- [ ] `GyeonggiApiClient.java` 생성
- [ ] `GyeonggiBusSyncService.java` 생성
- [ ] DTO 클래스 생성
- [ ] 승인된 API 목록:
  - ✅ 경기도 정류소 조회
  - ✅ 경기도 버스도착정보 조회
  - ✅ 경기도 버스노선 조회
  - ✅ 경기도 버스위치정보 조회

### 2.2 인천 버스 API 클라이언트
- [ ] `IncheonApiClient.java` 생성
- [ ] `IncheonBusSyncService.java` 생성
- [ ] DTO 클래스 생성
- [ ] 승인된 API 목록:
  - ✅ 인천광역시 정류소 조회
  - ✅ 인천광역시 도착정보 조회
  - ✅ 인천광역시 버스노선 조회
  - ✅ 인천광역시 버스위치정보 조회

### 2.3 데이터베이스 변경
- [ ] `stations.region_code` 추가 (SEOUL, GYEONGGI, INCHEON)
- [ ] `routes.route_type` 확장 (EXPRESS_BUS, TOWN_BUS)

### 2.4 K-패스 적용 로직
- [ ] `Route.java` - `kPassEligible` 필드 추가
- [ ] K-패스 적용 조건 로직 구현
  - 시내버스 ✅
  - 마을버스 ✅
  - 광역버스 ✅
  - 지하철 ✅
  - 신분당선/GTX ✅
  - KTX, SRT, 시외버스 ❌

### 2.5 환경변수 (.env)
- [ ] `GYEONGGI_API_KEY` 추가
- [ ] `INCHEON_API_KEY` 추가 (또는 PUBLIC_API_SERVICE_KEY 공용)

---

## Phase 3: 신분당선/GTX + 모두의카드

### 3.1 특수 노선 처리
- [ ] 신분당선 API 연동 조사
- [ ] GTX-A API 연동 조사
- [ ] `routes.is_premium_rail` 필드 추가
- [ ] `routes.premium_rail_type` 필드 추가 (SHINBUNDANG, GTX)

### 3.2 모두의카드 적용
- [ ] `Route.java` - `allCardEligible` 필드 추가
- [ ] 모두의카드 적용 로직 구현

---

## Phase 4: 모바일 앱 (Android/iOS)

### 4.1 기술 스택 결정
- [ ] React Native vs Flutter vs 네이티브 선택
  - 추천: React Native (기존 React 코드 재사용)

### 4.2 기본 앱 개발
- [ ] 프로젝트 초기화 (React Native)
- [ ] 지도 + GPS 기반 주변 정류장
- [ ] 실시간 도착정보
- [ ] 카드 적용 여부 표시

### 4.3 모바일 전용 기능
- [ ] 푸시 알림 (Firebase Cloud Messaging)
- [ ] 홈 화면 위젯
- [ ] 오프라인 캐싱
- [ ] GPS 백그라운드 추적 (선택)
- [ ] NFC 연동 (선택)

### 4.4 앱스토어 배포
- [ ] Google Play Store 개발자 계정 ($25)
- [ ] Apple App Store 개발자 계정 ($99/년)
- [ ] 앱 심사 대응

---

## 참고 링크

- [서울 열린데이터광장](https://data.seoul.go.kr)
- [공공데이터포털](https://data.go.kr)
- [경기버스정보 (GBIS)](https://www.gbis.go.kr)
- [기후동행카드 공식](https://news.seoul.go.kr/traffic/climate-card)
- [K-패스 공식](https://www.kpass.kr)
