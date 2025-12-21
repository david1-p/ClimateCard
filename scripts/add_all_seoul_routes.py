#!/usr/bin/env python3
"""
서울시 전체 버스 노선을 DB에 추가
모든 서울시 면허 버스는 기후동행카드 적용 대상
"""
import os
import pandas as pd
import psycopg2

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

def determine_route_type(route_name):
    """
    노선명으로 노선 유형 판단
    """
    route_name = str(route_name).strip()

    # 심야버스 (N으로 시작)
    if route_name.startswith('N') or route_name.startswith('n'):
        return '5'  # 심야버스

    # 숫자만 있는 경우
    if route_name.isdigit():
        if len(route_name) == 4:
            return '4'  # 지선버스 (4자리)
        elif len(route_name) == 3:
            return '3'  # 간선버스 (3자리)
        elif len(route_name) == 2:
            return '2'  # 순환버스 (2자리)

    # 숫자로 시작하는 경우 (예: 01A, 0017)
    if route_name[0].isdigit():
        # 앞부분이 0으로 시작하면 순환버스
        if route_name.startswith('0') and len(route_name) <= 3:
            return '2'  # 순환버스
        # 4자리 숫자로 시작하면 지선
        if len(route_name) >= 4 and route_name[:4].isdigit():
            return '4'
        # 3자리 숫자로 시작하면 간선
        if len(route_name) >= 3 and route_name[:3].isdigit():
            return '3'

    # 나머지는 마을버스로 간주 (강동01, 송파03 등)
    return '6'  # 마을버스

def main():
    print("=" * 60)
    print("Seoul Bus Routes Importer - All Routes")
    print("=" * 60)

    # Excel 파일 읽기
    excel_file = '/Users/david/Desktop/기후동행/서울시버스노선ID정보(20251209).xlsx'

    print(f"\n📊 Reading {excel_file}...")
    df = pd.read_excel(excel_file)

    print(f"✅ Found {len(df)} routes")
    print(f"📋 Columns: {list(df.columns)}\n")

    # DB 연결
    print("📡 Connecting to database...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    try:
        inserted = 0
        updated = 0
        skipped = 0

        with conn.cursor() as cur:
            for idx, row in df.iterrows():
                try:
                    route_id = str(row['ROUTEID']).strip()
                    route_name = str(row['노선명']).strip()
                    route_type = determine_route_type(route_name)

                    # 모든 서울시 면허 버스는 기후동행카드 적용
                    cur.execute("""
                        INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, region_name)
                        VALUES (%s, %s, %s, true, '서울특별시')
                        ON CONFLICT (route_id) DO UPDATE SET
                            climate_card_eligible = true,
                            route_type = EXCLUDED.route_type,
                            region_name = EXCLUDED.region_name;
                    """, (route_id, route_name, route_type))

                    if cur.rowcount > 0:
                        # 새로 삽입되었는지 업데이트되었는지 확인
                        cur.execute("SELECT climate_card_eligible FROM routes WHERE route_id = %s", (route_id,))
                        inserted += 1
                    else:
                        skipped += 1

                except Exception as e:
                    print(f"⚠️  Row {idx} error ({route_name}): {e}")
                    skipped += 1

                # 100개마다 커밋 및 진행상황 출력
                if (idx + 1) % 100 == 0:
                    conn.commit()
                    print(f"   Progress: {idx + 1}/{len(df)} rows processed")

            conn.commit()

        print(f"\n🎉 Import complete!")
        print(f"   ✅ Total routes processed: {len(df)}")
        print(f"   📊 Inserted/Updated: {inserted}")
        print(f"   ⏭️  Skipped: {skipped}")

        # 노선 유형별 통계
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    CASE route_type
                        WHEN '2' THEN '순환버스'
                        WHEN '3' THEN '간선버스'
                        WHEN '4' THEN '지선버스'
                        WHEN '5' THEN '심야버스'
                        WHEN '6' THEN '마을버스'
                        ELSE '기타'
                    END as type_name,
                    COUNT(*) as count
                FROM routes
                WHERE climate_card_eligible = true
                GROUP BY route_type
                ORDER BY route_type;
            """)

            print(f"\n📊 Climate Card Eligible Routes by Type:")
            for row in cur.fetchall():
                print(f"   - {row[0]}: {row[1]}개")

    finally:
        conn.close()
        print("\n✅ Database connection closed")

if __name__ == '__main__':
    main()
