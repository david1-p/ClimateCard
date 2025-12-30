# Archive - 사용하지 않는 스크립트

이 디렉토리는 현재 사용하지 않지만 나중에 필요할 수 있는 스크립트들을 보관합니다.

## 보관된 스크립트 분류

### 크롤링 스크립트 (중복 기능)
- `crawl_bus_stations.py`
- `crawl_bus_route_stations.py`
- `crawl_busgo_route_stations.py`

### 동기화 스크립트 (중복 기능)
- `sync_missing_route_stations.py`
- `sync_route_stations.py`
- `sync_via_station_api.py`

### 로드/업데이트 스크립트
- `load_climate_routes.py`
- `update_climate_routes.py`
- `load_all_village_buses.py`
- `add_village_buses.py`
- `update_missing_routes.py`
- `find_missing_routes.py`

### Fetch 스크립트
- `fetch_gangdong05_stations.py`
- `fetch_route_stations.py`
- `use_seoul_api_for_route_stations.py`
- `collect_all_route_stations.py`

### 기타
- `create_expanded_sample_data.py`
- `quick_load_stations.py`
- `check_express_buses.py`
- `find_express_bus_ids.py`
- `find_regional_buses.py`
- `import_seoul_bus_routes_excel.py`
- `update_station_mobile_numbers.py`

## 복구 방법

필요한 스크립트를 다시 사용하려면:
```bash
mv scripts/archive/SCRIPT_NAME.py scripts/
```
