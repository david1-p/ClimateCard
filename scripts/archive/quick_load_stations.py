#!/usr/bin/env python3
"""
서울시 버스 정류소 위치 정보를 Excel에서 빠르게 로드
"""
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

def load_stations_from_excel():
    """Excel 파일에서 정류소 정보 로드"""
    print("📁 Loading stations from Excel...")

    # Excel 파일 로드
    df = pd.read_excel(
        '/Users/david/Desktop/기후동행/data/서울시버스정류소위치정보(20251209).xlsx'
    )

    print(f"✅ Loaded {len(df)} stations from Excel")

    return df

def insert_stations(df):
    """정류소 데이터를 데이터베이스에 삽입"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 데이터 준비
    stations = []
    for _, row in df.iterrows():
        # ARS_ID가 NaN이면 NODE_ID 사용
        station_id = str(int(row['ARS_ID'])) if pd.notna(row['ARS_ID']) else str(int(row['NODE_ID']))

        station_data = (
            station_id,  # station_id
            str(row['정류소명']),  # station_name
            float(row['X좌표']),  # longitude
            float(row['Y좌표']),  # latitude
        )
        stations.append(station_data)

    # 정류소 삽입 (중복 무시)
    from psycopg2.extras import execute_batch

    insert_query = """
        INSERT INTO stations (station_id, station_name, location)
        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
        ON CONFLICT (station_id) DO NOTHING
    """

    execute_batch(cur, insert_query, stations, page_size=100)

    conn.commit()
    inserted = cur.rowcount

    cur.close()
    conn.close()

    print(f"✅ Inserted {inserted} stations into database")

    return inserted

def main():
    print("="*80)
    print("🚀 정류소 위치 데이터 빠른 로드")
    print("="*80)

    # Excel에서 정류소 로드
    df = load_stations_from_excel()

    # 데이터베이스에 삽입
    inserted = insert_stations(df)

    print("\n" + "="*80)
    print("✅ 완료!")
    print(f"   총 {inserted}개 정류소 로드됨")
    print("="*80)

if __name__ == "__main__":
    main()
