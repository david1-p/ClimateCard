#!/usr/bin/env python3
"""
서울시 마을버스 노선 정보를 API에서 가져와 데이터베이스에 추가하는 스크립트
"""
import os
import psycopg2
import requests
import xml.etree.ElementTree as ET
import time

# 환경 변수에서 설정 읽기
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'climate_transport'),
    'user': os.getenv('DB_USERNAME', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

# 공공데이터 API 키
API_KEY = os.getenv('PUBLIC_API_SERVICE_KEY', '148ff0c05b53284fd7738e5d3b241d132c8b81138098dcc1009f11f70d9ee16c')
BASE_URL = 'http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList'

# 서울시 각 구 이름
DISTRICTS = [
    '강남', '강동', '강북', '강서', '관악', '광진', '구로', '금천',
    '노원', '도봉', '동대문', '동작', '마포', '서대문', '서초', '성동',
    '성북', '송파', '양천', '영등포', '용산', '은평', '종로', '중구', '중랑'
]

def fetch_village_buses():
    """API를 통해 마을버스 노선 목록 조회"""
    print("🔍 마을버스 노선 검색 중...\n")

    village_buses = []

    for district in DISTRICTS:
        print(f'  [{district}] 검색 중...', end=' ')

        try:
            url = f'{BASE_URL}?serviceKey={API_KEY}&strSrch={district}'
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                root = ET.fromstring(response.content)

                district_count = 0
                for item in root.findall('.//msgBody/itemList'):
                    route_nm = item.find('busRouteNm')
                    route_id = item.find('busRouteId')
                    route_type = item.find('routeType')
                    corp_nm = item.find('corpNm')
                    st_station = item.find('stStationNm')
                    ed_station = item.find('edStationNm')

                    # routeType이 2인 경우만 (마을버스)
                    if route_nm is not None and route_type is not None and route_type.text == '2':
                        village_buses.append({
                            'route_id': route_id.text if route_id is not None else '',
                            'route_name': route_nm.text,
                            'route_type': '2',  # 마을버스
                            'agency_name': corp_nm.text if corp_nm is not None else '',
                            'start_station': st_station.text if st_station is not None else '',
                            'end_station': ed_station.text if ed_station is not None else ''
                        })
                        district_count += 1

                print(f'✅ {district_count}개 발견')
            else:
                print(f'❌ 오류 (HTTP {response.status_code})')

            time.sleep(0.2)  # API 요청 제한 방지

        except Exception as e:
            print(f'❌ 오류: {e}')

    return village_buses

def insert_village_buses_to_db(village_buses):
    """마을버스 노선을 데이터베이스에 삽입"""
    print(f"\n💾 {len(village_buses)}개의 마을버스를 데이터베이스에 추가 중...\n")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        inserted_count = 0
        updated_count = 0
        skipped_count = 0

        for bus in village_buses:
            route_id = bus['route_id']
            route_name = bus['route_name']

            if not route_id:
                print(f"  ⚠️  {route_name}: 노선 ID 없음 (건너뜀)")
                skipped_count += 1
                continue

            try:
                # 기존 노선 확인
                cur.execute("SELECT route_id FROM routes WHERE route_id = %s", (route_id,))
                exists = cur.fetchone()

                if exists:
                    # 기존 노선 업데이트
                    cur.execute("""
                        UPDATE routes
                        SET route_name = %s,
                            route_type = %s,
                            climate_card_eligible = false,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE route_id = %s
                    """, (route_name, bus['route_type'], route_id))
                    updated_count += 1
                    print(f"  🔄 {route_name} (ID: {route_id}) 업데이트됨")
                else:
                    # 새 노선 삽입
                    cur.execute("""
                        INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible)
                        VALUES (%s, %s, %s, false)
                    """, (route_id, route_name, bus['route_type']))
                    inserted_count += 1
                    print(f"  ✅ {route_name} (ID: {route_id}) 추가됨")

                # 매 10개마다 커밋
                if (inserted_count + updated_count) % 10 == 0:
                    conn.commit()

            except Exception as e:
                print(f"  ❌ {route_name} 처리 오류: {e}")
                conn.rollback()
                skipped_count += 1
                continue

        conn.commit()

        print(f"\n{'='*60}")
        print(f"✅ 완료!")
        print(f"  - 새로 추가: {inserted_count}개")
        print(f"  - 업데이트: {updated_count}개")
        print(f"  - 건너뜀: {skipped_count}개")
        print(f"  - 총 처리: {inserted_count + updated_count}개")
        print(f"{'='*60}")

    finally:
        cur.close()
        conn.close()

def fetch_route_stations(route_id):
    """특정 노선의 정류소 목록 조회"""
    url = f'http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute'
    params = {
        'serviceKey': API_KEY,
        'busRouteId': route_id
    }

    try:
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            root = ET.fromstring(response.content)

            stations = []
            for item in root.findall('.//msgBody/itemList'):
                station_id = item.find('station')
                station_seq = item.find('seq')

                if station_id is not None and station_seq is not None:
                    stations.append({
                        'station_id': station_id.text,
                        'sequence': int(station_seq.text)
                    })

            return stations
    except Exception as e:
        print(f"    ❌ 정류소 조회 오류: {e}")

    return []

def insert_route_stations_to_db(village_buses):
    """마을버스 노선별 정류소 정보를 데이터베이스에 삽입"""
    print(f"\n🚏 {len(village_buses)}개 마을버스의 정류소 정보 추가 중...\n")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        success_count = 0
        failed_count = 0

        for idx, bus in enumerate(village_buses, 1):
            route_id = bus['route_id']
            route_name = bus['route_name']

            if not route_id:
                continue

            print(f"  [{idx}/{len(village_buses)}] {route_name} (ID: {route_id})...", end=' ')

            # API로 정류소 목록 조회
            stations = fetch_route_stations(route_id)

            if not stations:
                print("⚠️  정류소 없음")
                failed_count += 1
                time.sleep(0.2)
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
                except Exception:
                    # 정류소가 stations 테이블에 없는 경우 무시
                    pass

            if inserted_stations > 0:
                conn.commit()
                success_count += 1
                print(f"✅ {inserted_stations}개 정류소 추가")
            else:
                print("⚠️  매칭되는 정류소 없음")
                failed_count += 1

            # API 요청 제한 방지
            time.sleep(0.2)

        print(f"\n{'='*60}")
        print(f"✅ 정류소 추가 완료!")
        print(f"  - 성공: {success_count}개 노선")
        print(f"  - 실패/없음: {failed_count}개 노선")
        print(f"{'='*60}")

    finally:
        cur.close()
        conn.close()

def main():
    """메인 함수"""
    print("🚀 마을버스 데이터 추가 시작\n")
    print(f"{'='*60}\n")

    # 1. API로 마을버스 노선 목록 조회
    village_buses = fetch_village_buses()

    if not village_buses:
        print("\n❌ 마을버스를 찾을 수 없습니다.")
        return

    print(f"\n총 {len(village_buses)}개의 마을버스 발견")

    # 2. 데이터베이스에 노선 정보 추가
    insert_village_buses_to_db(village_buses)

    # 3. 정류소 정보도 추가할지 사용자에게 확인
    user_input = input("\n🤔 정류소 정보도 추가하시겠습니까? (시간이 걸릴 수 있습니다) (y/N): ")
    if user_input.lower() == 'y':
        insert_route_stations_to_db(village_buses)
    else:
        print("\n⏭️  정류소 정보 추가 건너뜀")

    print("\n🎉 완료!")

if __name__ == "__main__":
    main()
