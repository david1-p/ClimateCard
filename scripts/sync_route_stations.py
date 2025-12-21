#!/usr/bin/env python3
"""
서울시 공공 API에서 노선별 정류소 정보를 가져와서 DB에 저장하는 스크립트
"""
import os
import requests
import psycopg2
import xml.etree.ElementTree as ET
import time
from typing import List, Dict

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')
SERVICE_KEY = os.getenv('PUBLIC_API_SERVICE_KEY', '')

# API 엔드포인트
API_BASE_URL = "http://ws.bus.go.kr/api/rest"


def get_stations_by_route(route_id: str) -> List[Dict]:
    """노선별 정류소 목록 조회"""
    url = f"{API_BASE_URL}/busRouteInfo/getStaionByRoute"
    params = {
        'serviceKey': SERVICE_KEY,
        'busRouteId': route_id
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        # XML 파싱
        root = ET.fromstring(response.content)

        # msgHeader의 resultCode 확인
        result_code = root.find('.//headerCd')
        if result_code is not None and result_code.text != '0':
            print(f"  ⚠️  API 에러 for route {route_id}: {result_code.text}")
            return []

        # msgBody의 itemList 파싱
        items = []
        for item in root.findall('.//itemList'):
            station_id = item.find('station').text if item.find('station') is not None else None
            seq = item.find('seq').text if item.find('seq') is not None else None
            direction = item.find('direction').text if item.find('direction') is not None else ''

            if station_id and seq:
                items.append({
                    'station_id': station_id,
                    'sequence': int(seq),
                    'direction': direction
                })

        return items
    except Exception as e:
        print(f"  ❌ Error fetching stations for route {route_id}: {e}")
        return []


def get_all_routes(conn) -> List[tuple]:
    """DB에서 모든 노선 조회"""
    with conn.cursor() as cur:
        cur.execute("SELECT route_id, route_name FROM routes ORDER BY route_id;")
        return cur.fetchall()


def insert_route_stations(conn, route_id: str, stations: List[Dict]):
    """route_stations 테이블에 데이터 삽입"""
    if not stations:
        return 0

    with conn.cursor() as cur:
        # 기존 데이터 삭제
        cur.execute("DELETE FROM route_stations WHERE route_id = %s;", (route_id,))

        # 새 데이터 삽입
        insert_count = 0
        for station in stations:
            try:
                cur.execute("""
                    INSERT INTO route_stations (route_id, station_id, sequence, direction)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (route_id, station_id, sequence) DO NOTHING;
                """, (
                    route_id,
                    station['station_id'],
                    station['sequence'],
                    station['direction']
                ))
                insert_count += 1
            except Exception as e:
                print(f"    ⚠️  Insert error: {e}")

        conn.commit()
        return insert_count


def main():
    if not SERVICE_KEY:
        print("❌ PUBLIC_API_SERVICE_KEY 환경 변수가 설정되지 않았습니다.")
        return

    # DB 연결
    print("📡 Connecting to database...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    try:
        # 모든 노선 조회
        routes = get_all_routes(conn)
        print(f"✅ Found {len(routes)} routes in DB\n")

        total_stations = 0
        success_count = 0

        for i, (route_id, route_name) in enumerate(routes, 1):
            print(f"[{i}/{len(routes)}] Processing {route_name} (ID: {route_id})...")

            # API 호출
            stations = get_stations_by_route(route_id)

            if stations:
                inserted = insert_route_stations(conn, route_id, stations)
                print(f"  ✅ Inserted {inserted} stations")
                total_stations += inserted
                success_count += 1
            else:
                print(f"  ⚠️  No stations found")

            # API 호출 제한 방지 (초당 10회 제한)
            time.sleep(0.15)

        print(f"\n🎉 완료!")
        print(f"   - 처리된 노선: {success_count}/{len(routes)}")
        print(f"   - 총 정류소 관계: {total_stations}개")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
