#!/usr/bin/env python3
"""
정류소 데이터에 mobile_number (ARS ID) 업데이트
"""
import psycopg2
from psycopg2.extras import execute_batch
import pandas as pd
import os

# 데이터베이스 연결 설정
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = 'postgres'
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

def update_mobile_numbers():
    """엑셀 파일에서 ARS_ID를 읽어서 stations 테이블의 mobile_number 업데이트"""

    # 엑셀 파일 읽기
    excel_path = '/Users/david/Desktop/기후동행/data/서울시버스정류소위치정보(20251209).xlsx'
    print(f"📖 엑셀 파일 읽는 중: {excel_path}")

    df = pd.read_excel(excel_path)
    print(f"✅ {len(df):,}개 정류소 데이터 로드 완료")

    # 데이터베이스 연결
    print(f"\n🔌 데이터베이스 연결 중: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cur = conn.cursor()

    # ARS_ID가 있는 정류소만 추출
    updates = []
    for _, row in df.iterrows():
        if pd.notna(row.get('ARS_ID')):
            ars_id = str(int(row['ARS_ID']))
            # station_id는 ARS_ID 또는 NODE_ID로 저장되어 있음
            if pd.notna(row.get('ARS_ID')):
                station_id = str(int(row['ARS_ID']))
            else:
                station_id = str(int(row['NODE_ID']))

            updates.append((ars_id, station_id))

    print(f"\n📊 업데이트할 정류소 개수: {len(updates):,}")

    # mobile_number 업데이트
    update_query = """
        UPDATE stations
        SET mobile_number = %s
        WHERE station_id = %s
    """

    print("🔄 mobile_number 업데이트 중...")
    execute_batch(cur, update_query, updates, page_size=1000)
    conn.commit()

    # 결과 확인
    cur.execute("SELECT COUNT(*) FROM stations WHERE mobile_number IS NOT NULL AND mobile_number != ''")
    updated_count = cur.fetchone()[0]
    print(f"✅ mobile_number가 설정된 정류소: {updated_count:,}개")

    cur.execute("SELECT COUNT(*) FROM stations WHERE mobile_number IS NULL OR mobile_number = ''")
    null_count = cur.fetchone()[0]
    print(f"⚠️  mobile_number가 없는 정류소: {null_count:,}개")

    # 샘플 데이터 확인
    cur.execute("""
        SELECT station_id, station_name, mobile_number
        FROM stations
        WHERE mobile_number IS NOT NULL
        LIMIT 5
    """)
    samples = cur.fetchall()
    print("\n📋 샘플 데이터:")
    for station_id, station_name, mobile_number in samples:
        print(f"  - {station_name} (ID: {station_id}, ARS: {mobile_number})")

    cur.close()
    conn.close()

    print("\n✅ 완료!")

if __name__ == '__main__':
    update_mobile_numbers()
