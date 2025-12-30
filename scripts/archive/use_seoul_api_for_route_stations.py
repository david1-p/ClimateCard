#!/usr/bin/env python3
"""
서울 열린데이터광장 API를 사용해서 노선별 정류소 데이터 수집

Open API: 서울시 노선 정류장마스터 정보 (OA-21233)
http://openapi.seoul.go.kr:8088/{인증키}/json/RouteStation/1/1000/
"""

import requests
import json
import psycopg2
from psycopg2.extras import execute_batch
import time
import os
from datetime import datetime

# DB 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

# 서울시 Open API KEY (환경 변수 또는 기본값)
SEOUL_API_KEY = os.getenv('SEOUL_API_KEY', '676c6e765563643539384142745556')


def get_missing_routes():
    """정류소 연결이 없는 기후동행카드 적용 노선 조회"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 노선 정보 조회 (route_id와 노선명)
    cur.execute("""
        SELECT r.route_id, r.route_name, r.route_type
        FROM routes r
        WHERE r.climate_card_eligible = true
        AND NOT EXISTS (
            SELECT 1 FROM route_stations rs WHERE rs.route_id = r.route_id
        )
        ORDER BY r.route_type, r.route_name
    """)

    routes = {row[0]: row[1] for row in cur.fetchall()}  # {route_id: route_name}
    cur.close()
    conn.close()

    return routes


def fetch_route_stations_from_seoul_api(start_index=1, end_index=1000):
    """
    서울시 Open API에서 노선 정류장 데이터 조회

    API 예시:
    http://openapi.seoul.go.kr:8088/{인증키}/json/RouteStation/1/1000/

    응답 예상 형식:
    {
      "RouteStation": {
        "list_total_count": 12345,
        "RESULT": {"CODE": "INFO-000", "MESSAGE": "정상 처리되었습니다"},
        "row": [
          {
            "ROUTE_ID": "100100123",
            "ROUTE_NM": "421",
            "STATION_ID": "123000123",
            "STATION_NM": "서울역버스환승센터",
            "STATION_SEQ": 1
          },
          ...
        ]
      }
    }
    """
    url = f"http://openapi.seoul.go.kr:8088/{SEOUL_API_KEY}/json/RouteStation/{start_index}/{end_index}/"

    try:
        response = requests.get(url, timeout=15)

        if response.status_code == 200:
            data = response.json()

            # 에러 체크
            if 'RESULT' in data:
                result = data['RESULT']
                code = result.get('CODE', '')
                message = result.get('MESSAGE', '')

                if code != 'INFO-000':
                    print(f"      ⚠️  API 오류: {code} - {message}")
                    return None

            # 데이터 추출
            if 'RouteStation' in data and 'row' in data['RouteStation']:
                return data['RouteStation']['row']
            else:
                print(f"      ⚠️  응답 데이터 형식 오류")
                return None

        else:
            print(f"      ⚠️  HTTP {response.status_code}")
            return None

    except Exception as e:
        print(f"      ❌ API 호출 오류: {e}")
        return None


def parse_and_insert_data(conn, api_data, missing_routes):
    """
    API 응답 데이터를 파싱하고 DB에 저장
    기후동행카드 적용 노선만 필터링
    """
    if not api_data:
        return 0

    inserted = 0
    cur = conn.cursor()

    for item in api_data:
        # 필드명은 실제 API 응답에 따라 조정 필요
        route_id = item.get('ROUTE_ID') or item.get('route_id') or item.get('routeId')
        station_id = item.get('STATION_ID') or item.get('station_id') or item.get('stationId')
        sequence = item.get('STATION_SEQ') or item.get('station_seq') or item.get('seq') or 0

        # 기후동행카드 적용 노선만 저장
        if route_id not in missing_routes:
            continue

        if not station_id:
            continue

        try:
            sequence_int = int(sequence) if sequence else 0

            cur.execute("""
                INSERT INTO route_stations (route_id, station_id, sequence)
                VALUES (%s, %s, %s)
                ON CONFLICT (route_id, station_id) DO UPDATE SET sequence = %s
            """, (route_id, station_id, sequence_int, sequence_int))

            inserted += 1

        except Exception as e:
            # 정류소가 stations 테이블에 없는 경우 무시
            pass

    conn.commit()
    cur.close()

    return inserted


def main():
    print("=" * 80)
    print("🚀 서울시 Open API로 노선 정류소 데이터 수집")
    print("=" * 80)
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 누락된 노선 조회
    print("📋 정류소 연결이 없는 기후동행카드 노선 로드 중...")
    missing_routes = get_missing_routes()
    print(f"✅ 총 {len(missing_routes)}개 노선 발견\n")

    if not missing_routes:
        print("🎉 모든 노선에 정류소 연결이 있습니다!")
        return

    # DB 연결
    conn = psycopg2.connect(**DB_CONFIG)

    # 서울시 API는 페이지네이션 필요 (1000개씩)
    # 전체 데이터 개수를 모르므로, 빈 응답이 나올 때까지 반복
    total_inserted = 0
    page = 1
    page_size = 1000

    print("🔄 서울시 API에서 데이터 가져오는 중...\n")
    print("=" * 80)

    try:
        while True:
            start_index = (page - 1) * page_size + 1
            end_index = page * page_size

            print(f"\n[Page {page}] {start_index} ~ {end_index} 조회 중...", end=' ')

            # API 호출
            api_data = fetch_route_stations_from_seoul_api(start_index, end_index)

            if not api_data or len(api_data) == 0:
                print("ℹ️  더 이상 데이터 없음")
                break

            print(f"✅ {len(api_data)}개 항목 수신")

            # DB 저장
            inserted = parse_and_insert_data(conn, api_data, missing_routes)
            total_inserted += inserted

            print(f"   → {inserted}개 정류소 저장됨 (누적: {total_inserted}개)")

            # 페이지 크기보다 적게 받았으면 마지막 페이지
            if len(api_data) < page_size:
                break

            page += 1

            # API 호출 제한 방지
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
    print(f"  - 처리 대상: {len(missing_routes)}개 노선 누락")
    print(f"  - 총 저장된 정류소 연결: {total_inserted}개")

    # 남은 누락 노선 확인
    remaining = get_missing_routes()
    solved = len(missing_routes) - len(remaining)

    print(f"  - 해결된 노선: {solved}개")
    print(f"  - 여전히 누락: {len(remaining)}개")
    print("=" * 80)


if __name__ == "__main__":
    main()
