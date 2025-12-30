#!/usr/bin/env python3
"""
마을버스 노선 추가 - 강동01 등 마을버스를 DB에 추가
"""
import psycopg2
import requests
import os
import time
from psycopg2.extras import execute_batch

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

# 강동구 마을버스 목록 (확인된 route_id)
# 강동01 = 124900002이므로, 나머지도 순차적으로 증가할 것으로 추정
VILLAGE_BUSES = [
    ('강동01', '124900002'),
    ('강동02', '124900003'),
    ('강동03', '124900004'),
    ('강동04', '124900005'),
    ('강동05', '124900006'),
    ('강동06', '124900007'),
    ('강동07', '124900008'),
    ('강동08', '124900009'),
    ('강동09', '124900010'),
    ('강동10', '124900011'),
    ('강동11', '124900012'),
    ('강동12', '124900013'),
    ('강동13', '124900014'),
]

def fetch_route_from_busgo(route_id):
    """bus.go.kr에서 노선 정보 가져오기"""
    url = f"https://bus.go.kr/sbus/bus/selectBusposInfo.do?routeId={route_id}&isLowBus=N"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
    }

    try:
        response = requests.get(url, headers=headers, timeout=10, verify=False)
        data = response.json()
        result = data.get('ResponseVO', {}).get('data', {})

        # 디버깅: 응답 확인
        if not result or not result.get('resultRouteInfo'):
            print(f"  ⚠️  응답 데이터: code={data.get('ResponseVO', {}).get('code')}")

        return result
    except Exception as e:
        print(f"  ❌ API 호출 실패: {e}")
        return None

def add_village_buses():
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user='postgres', password=DB_PASSWORD
    )
    cur = conn.cursor()

    added = 0
    failed = 0

    for route_name, route_id in VILLAGE_BUSES:
        print(f"\n🚌 {route_name} (ID: {route_id})")

        data = fetch_route_from_busgo(route_id)
        stops = data.get('resultRouteStop', []) if data else []

        if not stops:
            print(f"  ⚠️  정류소 정보 없음 - 건너뜀")
            failed += 1
            continue

        try:
            # 노선 추가 (마을버스도 기후동행카드 적용)
            # 노선명은 stops의 첫번째 항목에서 가져오기
            actual_route_name = stops[0].get('busRouteNm', route_name) if stops else route_name

            cur.execute("""
                INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible)
                VALUES (%s, %s, 2, true)
                ON CONFLICT (route_id) DO UPDATE
                SET route_name = EXCLUDED.route_name,
                    climate_card_eligible = EXCLUDED.climate_card_eligible
            """, (route_id, actual_route_name))

            # 정류소 데이터 추가
            if stops:
                station_data = [
                    (str(s['station']), s['stationName'], float(s['gpsX']), float(s['gpsY']))
                    for s in stops if s.get('station') and s.get('gpsX') and s.get('gpsY')
                ]

                if station_data:
                    execute_batch(cur, """
                        INSERT INTO stations (station_id, station_name, location)
                        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                        ON CONFLICT (station_id) DO NOTHING
                    """, station_data, page_size=100)

                # route_stations 추가
                route_station_data = [
                    (route_id, str(s['station']), s['seq'])
                    for s in stops if s.get('station')
                ]

                if route_station_data:
                    execute_batch(cur, """
                        INSERT INTO route_stations (route_id, station_id, sequence)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (route_id, station_id)
                        DO UPDATE SET sequence = EXCLUDED.sequence
                    """, route_station_data, page_size=100)

            conn.commit()
            print(f"  ✅ 추가 완료 ({len(stops)}개 정류소)")
            added += 1

        except Exception as e:
            print(f"  ❌ 실패: {e}")
            conn.rollback()
            failed += 1

        time.sleep(0.5)

    cur.close()
    conn.close()

    print(f"\n{'='*50}")
    print(f"✅ 성공: {added}개 / ❌ 실패: {failed}개")
    print(f"{'='*50}")

if __name__ == '__main__':
    import urllib3
    urllib3.disable_warnings()
    add_village_buses()
