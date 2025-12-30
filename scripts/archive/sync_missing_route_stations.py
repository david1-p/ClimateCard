#!/usr/bin/env python3
"""
기후동행카드 적용 노선 중 정류소 연결이 없는 노선만 동기화
"""
import requests
import xml.etree.ElementTree as ET
import psycopg2
from psycopg2.extras import execute_batch
import time
import os
from datetime import datetime

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

# API 설정
PUBLIC_API_KEY = os.getenv('PUBLIC_API_SERVICE_KEY', '148ff0c05b53284fd7738e5d3b241d132c8b81138098dcc1009f11f70d9ee16c')
API_URL = 'http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute'

def get_missing_routes():
    """정류소 연결이 없는 기후동행카드 적용 노선만 조회"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT r.route_id, r.route_name, r.route_type
        FROM routes r
        WHERE r.climate_card_eligible = true
        AND NOT EXISTS (
            SELECT 1 FROM route_stations rs WHERE rs.route_id = r.route_id
        )
        ORDER BY r.route_type, r.route_name
    """)

    routes = cur.fetchall()
    cur.close()
    conn.close()

    return routes

def fetch_route_stations(route_id):
    """bus.go.kr API로 노선의 정류소 목록 조회"""
    params = {
        'serviceKey': PUBLIC_API_KEY,
        'busRouteId': route_id,
        'resultType': 'xml'
    }

    try:
        response = requests.get(API_URL, params=params, timeout=15)

        if response.status_code == 200:
            root = ET.fromstring(response.content)

            # 헤더 확인
            header_code = root.find('.//headerCd')
            if header_code is not None and header_code.text != '0':
                return None

            # 정류소 목록 추출
            stations = []
            for item in root.findall('.//itemList'):
                station_id = item.find('station')
                seq = item.find('seq')

                if station_id is not None and station_id.text:
                    stations.append({
                        'station_id': station_id.text,
                        'sequence': int(seq.text) if seq is not None and seq.text else 0
                    })

            return stations

    except Exception as e:
        print(f"      ⚠️  API 오류: {e}")
        return None

def insert_route_stations(conn, route_id, stations):
    """route_stations 테이블에 데이터 삽입"""
    if not stations:
        return 0

    cur = conn.cursor()

    data = [(route_id, s['station_id'], s['sequence']) for s in stations]

    query = """
        INSERT INTO route_stations (route_id, station_id, sequence)
        VALUES (%s, %s, %s)
        ON CONFLICT (route_id, station_id)
        DO UPDATE SET sequence = EXCLUDED.sequence
    """

    try:
        execute_batch(cur, query, data, page_size=1000)
        conn.commit()
        return len(data)
    except Exception as e:
        print(f"      ❌ DB 삽입 오류: {e}")
        conn.rollback()
        return 0

def main():
    """메인 함수"""
    print("=" * 80)
    print("🚀 누락된 노선 정류소 데이터 동기화")
    print("=" * 80)
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 1. 누락된 노선만 조회
    print("📋 정류소 연결이 없는 기후동행카드 노선 로드 중...")
    routes = get_missing_routes()
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
        for idx, (route_id, route_name, route_type) in enumerate(routes, 1):
            progress = (idx / total_routes) * 100
            print(f"[{idx}/{total_routes}] ({progress:.1f}%) {route_name} (ID: {route_id})", end=' ')

            # API 호출
            stations = fetch_route_stations(route_id)

            if stations is None:
                print("⚠️  API 실패")
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

            # API 호출 제한 방지
            time.sleep(0.3)

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
