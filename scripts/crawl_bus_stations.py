#!/usr/bin/env python3
"""
bus.go.kr 웹사이트에서 노선별 정류소 정보를 크롤링하는 스크립트
"""
import os
import requests
import psycopg2
import json
import time
from typing import List, Dict
import urllib3

# SSL 경고 비활성화
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')


def get_route_stations_from_web(route_id: str) -> List[Dict]:
    """
    bus.go.kr 웹사이트에서 노선별 정류소 목록 가져오기
    """
    # bus.go.kr의 노선별 정류소 조회 API
    url = "https://bus.go.kr/sbus/bus/getStaionByRoute.do"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://bus.go.kr/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
    }

    params = {
        'routeId': route_id
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10, verify=False)

        if response.status_code != 200:
            print(f"  ⚠️  HTTP {response.status_code}")
            return []

        # JSON 파싱
        data = response.json()

        # 응답 구조 확인
        if 'ResponseVO' in data:
            response_vo = data['ResponseVO']

            if response_vo.get('code') != 0:
                print(f"  ⚠️  API Error: {response_vo.get('message', 'Unknown error')}")
                return []

            result_data = response_vo.get('data', {})
            station_list = result_data.get('resultList', [])

            if not station_list:
                print(f"  ⚠️  No stations found in response")
                return []

            stations = []
            for station in station_list:
                station_id = station.get('stationId')
                seq = station.get('stationSeq') or station.get('seq')
                direction = station.get('direction', '')

                if station_id and seq:
                    stations.append({
                        'station_id': station_id,
                        'sequence': int(seq),
                        'direction': direction
                    })

            return stations
        else:
            print(f"  ⚠️  Unexpected response format")
            return []

    except requests.exceptions.Timeout:
        print(f"  ⚠️  Request timeout")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ⚠️  Request error: {e}")
        return []
    except json.JSONDecodeError:
        print(f"  ⚠️  Invalid JSON response")
        return []
    except Exception as e:
        print(f"  ⚠️  Unexpected error: {e}")
        return []


def get_all_routes(conn) -> List[tuple]:
    """DB에서 모든 노선 조회"""
    with conn.cursor() as cur:
        cur.execute("SELECT route_id, route_name FROM routes ORDER BY route_id LIMIT 10;")
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
    print("📡 Connecting to database...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    try:
        # 일단 처음 10개 노선만 테스트
        routes = get_all_routes(conn)
        print(f"✅ Found {len(routes)} routes in DB (testing first 10)\n")

        total_stations = 0
        success_count = 0

        for i, (route_id, route_name) in enumerate(routes, 1):
            print(f"[{i}/{len(routes)}] Processing {route_name} (ID: {route_id})...")

            # 웹 크롤링
            stations = get_route_stations_from_web(route_id)

            if stations:
                inserted = insert_route_stations(conn, route_id, stations)
                print(f"  ✅ Inserted {inserted} stations")
                total_stations += inserted
                success_count += 1
            else:
                print(f"  ⚠️  No stations found")

            # 크롤링 속도 제한 (서버 부하 방지)
            time.sleep(0.5)

        print(f"\n🎉 완료!")
        print(f"   - 처리된 노선: {success_count}/{len(routes)}")
        print(f"   - 총 정류소 관계: {total_stations}개")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
