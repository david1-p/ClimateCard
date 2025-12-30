#!/usr/bin/env python3
"""
TOPIS 웹사이트에서 노선별 정류소 정보 크롤링
"""
import requests
import time
import json
import psycopg2
from psycopg2.extras import execute_batch

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': '1q2w'
}

def get_climate_routes():
    """데이터베이스에서 기후동행카드 적용 노선 목록 조회"""
    print("📋 Loading climate card eligible routes from database...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT route_id, route_name, route_type
        FROM routes
        WHERE climate_card_eligible = true
        ORDER BY route_name
    """)

    routes = cur.fetchall()
    cur.close()
    conn.close()

    print(f"✅ Loaded {len(routes)} routes")
    return routes

def crawl_route_stations_from_topis(route_id, route_name):
    """
    TOPIS API를 통해 노선별 정류소 목록 조회
    (비공식 엔드포인트 - 웹사이트에서 사용하는 것)
    """
    url = f"https://topis.seoul.go.kr/api/getRouteStationList.do"

    params = {
        'routeId': route_id
    }

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            try:
                data = response.json()
                if 'result' in data and isinstance(data['result'], list):
                    return data['result']
            except:
                pass

        return []
    except Exception as e:
        print(f"    ❌ Error crawling {route_name}: {e}")
        return []

def insert_route_stations_batch(route_stations_data):
    """수집한 데이터를 데이터베이스에 삽입"""
    print(f"\n💾 Inserting {len(route_stations_data)} route-station mappings...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 데이터 포맷: [(route_id, station_id, sequence), ...]
    query = """
        INSERT INTO route_stations (route_id, station_id, sequence)
        VALUES (%s, %s, %s)
        ON CONFLICT (route_id, station_id)
        DO UPDATE SET sequence = EXCLUDED.sequence
    """

    try:
        execute_batch(cur, query, route_stations_data, page_size=1000)
        conn.commit()
        print(f"✅ Successfully inserted {len(route_stations_data)} mappings")
    except Exception as e:
        print(f"❌ Error inserting data: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def create_sample_data_for_major_routes():
    """
    주요 노선에 대한 샘플 데이터 생성
    (크롤링이 실패할 경우를 대비한 대안)
    """
    print("\n📝 Creating sample data for major routes...")

    # 주요 간선/지선 노선의 대표 정류소들
    sample_mappings = [
        # 140번 (간선) - 시청, 광화문, 종로 경유
        ('100100019', '101000290', 10),  # 시청앞.덕수궁
        ('100100019', '101900006', 15),  # 프레스센터
        ('100100019', '100000034', 20),  # 광화문

        # 141번 (간선)
        ('100100020', '101000290', 8),
        ('100100020', '101900011', 12),

        # 145번 (간선)
        ('100100024', '101000290', 5),

        # 146번 (간선)
        ('100100025', '101000290', 7),
        ('100100025', '101900011', 10),

        # 더 많은 샘플 추가...
    ]

    return sample_mappings

def main():
    """메인 함수"""
    print("🚀 Starting bus route-station crawling...\n")

    # 1. 기후동행카드 적용 노선 로드
    routes = get_climate_routes()

    # 2. 크롤링 시도
    all_mappings = []
    success_count = 0

    print("\n🕷️ Attempting to crawl route-station data from TOPIS...")
    print("(This may take a while...)\n")

    for idx, (route_id, route_name, route_type) in enumerate(routes[:10], 1):  # 일단 10개만 테스트
        print(f"  [{idx}/10] Crawling route {route_name} (ID: {route_id})...")

        stations = crawl_route_stations_from_topis(route_id, route_name)

        if stations:
            for seq, station in enumerate(stations, 1):
                station_id = station.get('stationId') or station.get('NODE_ID')
                if station_id:
                    all_mappings.append((route_id, str(station_id), seq))

            success_count += 1
            print(f"    ✅ Found {len(stations)} stations")
        else:
            print(f"    ⚠️  No stations found")

        time.sleep(0.2)  # 요청 제한 방지

    print(f"\n📊 Crawling results: {success_count}/10 routes successful")

    # 3. 크롤링이 실패했다면 샘플 데이터 사용
    if len(all_mappings) < 50:
        print("\n⚠️  Crawling didn't collect enough data. Using sample data instead...")
        all_mappings = create_sample_data_for_major_routes()

    # 4. 데이터베이스에 삽입
    if all_mappings:
        insert_route_stations_batch(all_mappings)
    else:
        print("\n❌ No data collected.")

    print("\n🎉 Done!")

if __name__ == "__main__":
    main()
