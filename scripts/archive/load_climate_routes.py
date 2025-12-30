#!/usr/bin/env python3
"""
기후동행카드 적용 노선 정보를 데이터베이스에 로드하는 스크립트
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import requests
import time
import xml.etree.ElementTree as ET

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': '1q2w'
}

# 서울 API 설정
SEOUL_API_KEY = '6279426e576364353130307a75485761'
SEOUL_API_BASE = 'http://openapi.seoul.go.kr:8088'

def load_excel_data():
    """엑셀 파일에서 데이터 로드"""
    print("📁 Loading Excel files...")

    # 기후동행카드 적용 노선
    climate_routes = pd.read_excel(
        '/Users/david/Desktop/기후동행/data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx',
        sheet_name='버스'
    )

    # 서울시 버스노선ID 정보
    route_ids = pd.read_excel(
        '/Users/david/Desktop/기후동행/data/서울시버스노선ID정보(20251209).xlsx'
    )

    print(f"✅ Loaded {len(climate_routes)} climate routes")
    print(f"✅ Loaded {len(route_ids)} route IDs")

    return climate_routes, route_ids

def merge_route_data(climate_routes, route_ids):
    """노선 데이터 병합"""
    print("\n🔗 Merging route data...")

    # 노선번호 컬럼명 정리
    climate_routes['route_name'] = climate_routes['노선\n번호'].astype(str).str.strip()
    route_ids['route_name'] = route_ids['노선명'].astype(str).str.strip()

    # 기후동행카드 적용 노선만 필터링
    climate_only = climate_routes[climate_routes['기후동행카드 적용여부'] == 'O'].copy()

    # 매칭
    merged = climate_only.merge(route_ids, on='route_name', how='left')

    print(f"✅ Merged {len(merged)} routes")
    print(f"⚠️  {merged['ROUTEID'].isna().sum()} routes without ROUTEID")

    return merged

def get_route_stations_from_seoul_api(route_id):
    """서울 API로 노선의 정류소 목록 조회"""
    url = f"{SEOUL_API_BASE}/{SEOUL_API_KEY}/xml/busRouteStationInfo/1/1000/{route_id}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        root = ET.fromstring(response.content)

        # 에러 체크
        result = root.find('RESULT/CODE')
        if result is not None and result.text != 'INFO-000':
            return []

        # 정류소 목록 추출
        stations = []
        for row in root.findall('row'):
            station_id = row.find('STATION_ID')
            station_seq = row.find('STATION_SEQ')

            if station_id is not None and station_seq is not None:
                stations.append({
                    'station_id': station_id.text,
                    'sequence': int(station_seq.text)
                })

        return stations
    except Exception as e:
        print(f"    ❌ Error fetching stations for route {route_id}: {e}")
        return []

def insert_routes_to_db(merged_routes):
    """데이터베이스에 노선 정보 삽입"""
    print("\n💾 Inserting routes to database...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        inserted_count = 0
        skipped_count = 0

        for _, row in merged_routes.iterrows():
            if pd.isna(row['ROUTEID']):
                skipped_count += 1
                continue

            route_id = str(int(row['ROUTEID']))
            route_name = row['route_name']
            route_type = row['유형']

            # 노선 타입 매핑 (간선=3, 지선=4, 순환=2, 광역=5, 심야=6, 공항=7)
            type_map = {
                '간선': '3',
                '지선': '4',
                '순환': '2',
                '광역': '5',
                '심야': '6',
                '공항': '7'
            }
            route_type_code = type_map.get(route_type, '0')

            try:
                cur.execute("""
                    INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible)
                    VALUES (%s, %s, %s, true)
                    ON CONFLICT (route_id)
                    DO UPDATE SET
                        route_name = EXCLUDED.route_name,
                        route_type = EXCLUDED.route_type,
                        climate_card_eligible = true
                """, (route_id, route_name, route_type_code))

                inserted_count += 1

                if inserted_count % 50 == 0:
                    print(f"  ✅ Inserted {inserted_count} routes...")

            except Exception as e:
                print(f"  ❌ Error inserting route {route_name}: {e}")
                conn.rollback()
                continue

        conn.commit()
        print(f"\n✅ Successfully inserted {inserted_count} routes")
        print(f"⚠️  Skipped {skipped_count} routes without ROUTEID")

    finally:
        cur.close()
        conn.close()

def insert_route_stations_to_db(merged_routes):
    """노선별 정류소 정보를 데이터베이스에 삽입"""
    print("\n🚏 Fetching and inserting route-station relationships...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        total_routes = len(merged_routes[~merged_routes['ROUTEID'].isna()])
        processed = 0
        success = 0

        for _, row in merged_routes.iterrows():
            if pd.isna(row['ROUTEID']):
                continue

            route_id = str(int(row['ROUTEID']))
            route_name = row['route_name']

            processed += 1
            print(f"  [{processed}/{total_routes}] Processing {route_name} (ID: {route_id})...")

            # 서울 API로 정류소 목록 조회
            stations = get_route_stations_from_seoul_api(route_id)

            if not stations:
                print(f"    ⚠️  No stations found for {route_name}")
                continue

            # 데이터베이스에 삽입
            inserted_stations = 0
            for station in stations:
                try:
                    cur.execute("""
                        INSERT INTO route_stations (route_id, station_id, sequence)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (route_id, station_id)
                        DO UPDATE SET sequence = EXCLUDED.sequence
                    """, (route_id, station['station_id'], station['sequence']))
                    inserted_stations += 1
                except Exception as e:
                    # 정류소가 stations 테이블에 없는 경우 무시
                    pass

            if inserted_stations > 0:
                conn.commit()
                success += 1
                print(f"    ✅ Inserted {inserted_stations} stations")
            else:
                print(f"    ⚠️  No matching stations in database")

            # API 요청 제한 방지
            time.sleep(0.1)

        print(f"\n✅ Successfully processed {success}/{total_routes} routes")

    finally:
        cur.close()
        conn.close()

def main():
    """메인 함수"""
    print("🚀 Starting climate route data loading...\n")

    # 1. 엑셀 데이터 로드
    climate_routes, route_ids = load_excel_data()

    # 2. 데이터 병합
    merged = merge_route_data(climate_routes, route_ids)

    # 3. 노선 정보 데이터베이스에 삽입
    insert_routes_to_db(merged)

    # 4. 노선별 정류소 정보 삽입
    user_input = input("\n🤔 Do you want to fetch and insert route-station data? This may take several minutes. (y/N): ")
    if user_input.lower() == 'y':
        insert_route_stations_to_db(merged)
    else:
        print("⏭️  Skipping route-station data insertion")

    print("\n🎉 Done!")

if __name__ == "__main__":
    main()
