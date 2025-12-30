#!/usr/bin/env python3
"""
bus.go.kr에서 노선별 정류소 데이터 크롤링
"""
import requests
import psycopg2
from psycopg2.extras import execute_batch
import time
import os
from datetime import datetime
import urllib3

# SSL 경고 비활성화
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

# bus.go.kr API
BUS_GO_KR_API = 'https://bus.go.kr/sbus/bus/selectBusposInfo.do'

def get_routes_without_stations():
    """정류소 연결이 없는 기후동행카드 적용 노선 조회"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT r.route_id, r.route_name
        FROM routes r
        WHERE r.climate_card_eligible = true
        AND NOT EXISTS (
            SELECT 1 FROM route_stations rs WHERE rs.route_id = r.route_id
        )
        ORDER BY r.route_name
    """)

    routes = cur.fetchall()
    cur.close()
    conn.close()

    return routes

def fetch_route_stations_from_busgo(route_id):
    """bus.go.kr에서 노선의 정류소 목록 조회"""
    url = f"{BUS_GO_KR_API}?routeId={route_id}&isLowBus=N"

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        response.raise_for_status()

        data = response.json()

        # 응답 확인
        if data.get('ResponseVO', {}).get('code') != 0:
            return None

        # 정류소 목록 추출
        stops = data.get('ResponseVO', {}).get('data', {}).get('resultRouteStop', [])

        stations = []
        for stop in stops:
            station_id = str(stop.get('station', ''))
            seq = stop.get('seq', 0)
            station_name = stop.get('stationName', '')
            gps_x = stop.get('gpsX')
            gps_y = stop.get('gpsY')

            if station_id:
                stations.append({
                    'station_id': station_id,
                    'sequence': seq,
                    'station_name': station_name,
                    'gpsX': gps_x,
                    'gpsY': gps_y
                })

        return stations

    except Exception as e:
        print(f"      ⚠️  크롤링 오류: {e}")
        return None

def insert_route_stations(conn, route_id, stations):
    """정류소 및 route_stations 테이블에 데이터 삽입"""
    if not stations:
        return 0

    cur = conn.cursor()

    # 1. 먼저 정류소 데이터 삽입 (ON CONFLICT DO NOTHING)
    station_data = [
        (s['station_id'], s.get('station_name', ''),
         float(s.get('gpsX', 0)), float(s.get('gpsY', 0)))
        for s in stations if s.get('gpsX') and s.get('gpsY')
    ]

    if station_data:
        station_query = """
            INSERT INTO stations (station_id, station_name, location)
            VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            ON CONFLICT (station_id) DO NOTHING
        """
        try:
            execute_batch(cur, station_query, station_data, page_size=1000)
        except Exception as e:
            print(f"      ⚠️  정류소 삽입 경고: {e}")

    # 2. route_stations 연결 데이터 삽입
    route_station_data = [(route_id, s['station_id'], s['sequence']) for s in stations]

    query = """
        INSERT INTO route_stations (route_id, station_id, sequence)
        VALUES (%s, %s, %s)
        ON CONFLICT (route_id, station_id)
        DO UPDATE SET sequence = EXCLUDED.sequence
    """

    try:
        execute_batch(cur, query, route_station_data, page_size=1000)
        conn.commit()
        return len(route_station_data)
    except Exception as e:
        print(f"      ❌ DB 삽입 오류: {e}")
        conn.rollback()
        return 0

def main():
    """메인 함수"""
    print("=" * 80)
    print("🚀 bus.go.kr에서 노선 정류소 데이터 크롤링")
    print("=" * 80)
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 1. 누락된 노선 조회
    print("📋 정류소 연결이 없는 기후동행카드 노선 로드 중...")
    routes = get_routes_without_stations()
    print(f"✅ 총 {len(routes)}개 노선 발견\n")

    if not routes:
        print("🎉 모든 노선에 정류소 연결이 있습니다!")
        return

    # 2. DB 연결
    conn = psycopg2.connect(**DB_CONFIG)

    # 3. 통계 변수
    total_routes = len(routes)
    success_count = 0
    fail_count = 0
    total_stations = 0

    print("🔄 정류소 데이터 수집 시작...\n")
    print("=" * 80)

    try:
        for idx, (route_id, route_name) in enumerate(routes, 1):
            progress = (idx / total_routes) * 100
            print(f"[{idx}/{total_routes}] ({progress:.1f}%) {route_name} (ID: {route_id})", end=' ')

            # bus.go.kr 크롤링
            stations = fetch_route_stations_from_busgo(route_id)

            if stations is None:
                print("⚠️  크롤링 실패")
                fail_count += 1
            elif len(stations) == 0:
                print("ℹ️  정류소 없음")
                fail_count += 1
            else:
                # DB에 저장
                inserted = insert_route_stations(conn, route_id, stations)

                if inserted > 0:
                    print(f"✅ {inserted}개 정류소")
                    success_count += 1
                    total_stations += inserted
                else:
                    print("❌ 저장 실패")
                    fail_count += 1

            # 서버 부하 방지 (0.5초 대기)
            time.sleep(0.5)

    except KeyboardInterrupt:
        print("\n\n⚠️  사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n\n❌ 오류 발생: {e}")
    finally:
        conn.close()

    # 최종 통계
    print("\n" + "=" * 80)
    print("🎉 데이터 수집 완료!")
    print("=" * 80)
    print(f"⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    print("📊 최종 통계:")
    print(f"  - 처리 대상: {total_routes}개 노선")
    print(f"  - 성공: {success_count}개")
    print(f"  - 실패: {fail_count}개")
    print(f"  - 총 정류소 연결: {total_stations}개")
    print("=" * 80)

if __name__ == "__main__":
    main()
