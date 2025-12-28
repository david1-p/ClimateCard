#!/usr/bin/env python3
"""
서울시 전체 마을버스 노선 추가
서울시버스노선ID정보.xlsx에서 마을버스 목록을 읽어서 DB에 추가
"""
import psycopg2
import pandas as pd
import requests
import os
import time
from psycopg2.extras import execute_batch

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

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
        return result
    except Exception as e:
        return None

def load_all_village_buses():
    # 엑셀에서 마을버스 목록 읽기
    df = pd.read_excel('/Users/david/Desktop/기후동행/data/서울시버스노선ID정보(20251209).xlsx')
    
    # 마을버스 필터링 (한글+숫자 패턴)
    village_pattern = r'^[가-힣]+\d+'
    village_buses = df[df['노선명'].astype(str).str.match(village_pattern, na=False)]
    
    print(f"📋 총 {len(village_buses)}개 마을버스 처리 시작\n")
    
    # DB 연결
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, database=DB_NAME,
        user='postgres', password=DB_PASSWORD
    )
    cur = conn.cursor()
    
    added = 0
    skipped = 0
    failed = 0
    
    for idx, row in village_buses.iterrows():
        route_name = str(row['노선명'])
        route_id = str(row['ROUTEID'])
        
        print(f"🚌 {route_name} (ID: {route_id})...", end=' ')
        
        # bus.go.kr에서 정보 가져오기
        data = fetch_route_from_busgo(route_id)
        stops = data.get('resultRouteStop', []) if data else []
        
        if not stops:
            print("⏭️  정류소 없음")
            skipped += 1
            time.sleep(0.3)
            continue
        
        try:
            # 노선 추가
            cur.execute("""
                INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible)
                VALUES (%s, %s, 2, true)
                ON CONFLICT (route_id) DO UPDATE
                SET route_name = EXCLUDED.route_name,
                    climate_card_eligible = EXCLUDED.climate_card_eligible
            """, (route_id, route_name))
            
            # 정류소 추가
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
            print(f"✅ {len(stops)}개 정류소")
            added += 1
            
        except Exception as e:
            print(f"❌ {e}")
            conn.rollback()
            failed += 1
        
        time.sleep(0.3)  # API 부하 방지
    
    cur.close()
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"✅ 성공: {added}개")
    print(f"⏭️  건너뜀: {skipped}개")
    print(f"❌ 실패: {failed}개")
    print(f"{'='*60}")

if __name__ == '__main__':
    import urllib3
    urllib3.disable_warnings()
    load_all_village_buses()
