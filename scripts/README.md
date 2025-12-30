# 데이터 관리 스크립트

운영에 필요한 핵심 스크립트 모음

## 📋 스크립트 목록

### 1. `add_all_seoul_routes.py`
**용도**: 서울시 버스 노선 일괄 추가

**실행 방법**:
```bash
python3 add_all_seoul_routes.py
```

**설명**: 서울시 API를 통해 기후동행카드가 적용되는 모든 서울 버스 노선을 DB에 추가합니다.

---

### 2. `add_express_buses.py`
**용도**: 광역버스(8xxx번) 추가

**실행 방법**:
```bash
python3 add_express_buses.py
```

**설명**: 광역버스 노선(8000번대)을 DB에 추가합니다.

---

### 3. `add_gyeonggi_incheon_buses.py`
**용도**: 경기/인천 버스 노선 추가

**실행 방법**:
```bash
python3 add_gyeonggi_incheon_buses.py
```

**설명**: 기후동행카드가 적용되는 경기도 및 인천 버스 노선을 DB에 추가합니다.

---

### 4. `add_village_buses.py`
**용도**: 마을버스 노선 추가

**실행 방법**:
```bash
python3 add_village_buses.py
```

**설명**: 서울시 마을버스 노선을 DB에 추가합니다.

---

## 🗂️ Archive
개발 과정에서 사용했던 디버깅/테스트용 스크립트는 `archive/` 디렉토리에 보관되어 있습니다.

## ⚠️ 주의사항
- 모든 스크립트는 환경변수가 설정되어 있어야 합니다.
- DB 연결 정보: `.env` 파일 참조
- API 키: `PUBLIC_API_SERVICE_KEY`, `SEOUL_API_KEY`
