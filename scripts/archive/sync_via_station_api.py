#!/usr/bin/env python3
"""
공공 API getRouteByStation을 사용해서 정류소별 노선 정보 수집
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
API_URL = "http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation"


def get_routes_by_station(ars_id: str) -> List[Dict]:
    """
    정류소 번호로 경유 노선 목록 조회
    """
    params = {
        'serviceKey': SERVICE_KEY,
        'arsId': ars_id
    }

    try:
        response = requests.get(API_URL, params=params, timeout=10)

        if response.status_code != 200:
            print(f"  ⚠️  HTTP {response.status_code}")
            return []

        # XML 파싱
        root = ET.fromstring(response.content)

        # 에러 코드 확인
        header_cd = root.find('.//headerCd')
        if header_cd is not None and header_cd.text != '0':
            error_msg = root.find('.//headerMsg')
            error_text = error_msg.text if error_msg is not None else 'Unknown error'
            if header_cd.text == '3':
                # 정류소를 찾을 수 없음 (DB와 불일치)
                return []
            print(f"  ⚠️  API Error {header_cd.text}: {error_text}")
            return []

        # 노선 목록 파싱
        routes = []
        for item in root.findall('.//itemList'):
            bus_route_id = item.find('busRouteId')

            if bus_route_id is not None and bus_route_id.text:
                routes.append({
                    'route_id': bus_route_id.text,
                })

        return routes

    except requests.exceptions.Timeout:
        print(f"  ⚠️  Request timeout")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ⚠️  Request error: {e}")
        return []
    except ET.ParseError:
        print(f"  ⚠️  XML parse error")
        return []
    except Exception as e:
        print(f"  ⚠️  Unexpected error: {e}")
        return []


def get_stations_with_mobile_number(conn, limit=100) -> List[tuple]:
    """DB에서 mobile_number가 있는 정류소 조회"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT station_id, station_name, mobile_number
            FROM stations
            WHERE mobile_number IS NOT NULL
            AND mobile_number != ''
            ORDER BY station_id
            LIMIT %s;
        """, (limit,))
        return cur.fetchall()


def insert_route_station(conn, route_id: str, station_id: str):
    """route_stations 테이블에 데이터 삽입"""
    with conn.cursor() as cur:
        try:
            # sequence는 일단 0으로 (나중에 업데이트 가능)
            cur.execute("""
                INSERT INTO route_stations (route_id, station_id, sequence, direction)
                VALUES (%s, %s, 0, '')
                ON CONFLICT (route_id, station_id, sequence) DO NOTHING;
            """, (route_id, station_id))
            return True
        except Exception as e:
            print(f"    ⚠️  Insert error: {e}")
            return False


def main():
    if not SERVICE_KEY:
        print("❌ PUBLIC_API_SERVICE_KEY 환경 변수가 설정되지 않았습니다.")
        return

    print("📡 Connecting to database...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    try:
        # 처음 100개 정류소만 테스트
        stations = get_stations_with_mobile_number(conn, limit=100)
        print(f"✅ Found {len(stations)} stations with mobile number\n")

        total_relations = 0
        success_count = 0

        for i, (station_id, station_name, mobile_number) in enumerate(stations, 1):
            print(f"[{i}/{len(stations)}] {station_name} (정류소번호: {mobile_number})...")

            # API 호출
            routes = get_routes_by_station(mobile_number)

            if routes:
                inserted = 0
                for route in routes:
                    if insert_route_station(conn, route['route_id'], station_id):
                        inserted += 1

                conn.commit()
                print(f"  ✅ Inserted {inserted} routes")
                total_relations += inserted
                success_count += 1
            else:
                print(f"  ⚠️  No routes found")

            # API 호출 제한 방지 (초당 30TPS)
            time.sleep(0.05)

        print(f"\n🎉 완료!")
        print(f"   - 처리된 정류소: {success_count}/{len(stations)}")
        print(f"   - 총 노선-정류소 관계: {total_relations}개")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
