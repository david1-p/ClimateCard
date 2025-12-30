#!/usr/bin/env python3
"""
광역버스 노선을 DB에 추가
모든 광역버스는 기후동행카드 적용 대상
"""
import os
import psycopg2

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

# 광역버스 목록 (노선 ID, 노선명)
EXPRESS_BUSES = [
    ('100100389', '9401'),
    ('100100391', '9404'),
    ('100100392', '9408'),
    ('107000005', '9409'),
    ('100100400', '9707'),
    ('100100607', '9711'),
    ('113000004', '9401-1'),
    ('107000006', '서울01출근'),
    ('107000010', '서울01퇴근'),
    ('111000020', '서울03출근'),
    ('111000024', '서울03퇴근'),
    ('113000005', '서울06출근'),
    ('109000005', '서울06퇴근'),
]

def main():
    print("=" * 60)
    print("Express Bus Routes Importer")
    print("=" * 60)

    print(f"\n📋 광역버스 {len(EXPRESS_BUSES)}개 노선 추가 중...\n")

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

        with conn.cursor() as cur:
            for route_id, route_name in EXPRESS_BUSES:
                try:
                    # 광역버스 route_type은 '1' (서울시 공공 API 기준)
                    # 1: 공항, 3: 간선, 4: 지선, 5: 순환, 6: 광역, 7: 마을
                    # 하지만 일반적으로 광역은 '1'로 표시됨
                    cur.execute("""
                        INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, region_name)
                        VALUES (%s, %s, '1', true, '서울특별시')
                        ON CONFLICT (route_id) DO UPDATE SET
                            climate_card_eligible = true,
                            route_type = '1',
                            region_name = EXCLUDED.region_name;
                    """, (route_id, route_name))

                    if cur.rowcount > 0:
                        cur.execute("""
                            SELECT climate_card_eligible
                            FROM routes
                            WHERE route_id = %s AND route_name = %s
                        """, (route_id, route_name))

                        if cur.fetchone():
                            print(f"   ✅ {route_name} (ID: {route_id})")
                            inserted += 1
                        else:
                            print(f"   🔄 {route_name} (ID: {route_id}) - 업데이트됨")
                            updated += 1

                except Exception as e:
                    print(f"   ⚠️  {route_name} error: {e}")

            conn.commit()

        print(f"\n🎉 Import complete!")
        print(f"   ✅ 총 처리: {len(EXPRESS_BUSES)}개")
        print(f"   📊 추가/업데이트: {inserted}개")

        # 광역버스 통계
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM routes
                WHERE route_type = '1' AND climate_card_eligible = true;
            """)

            count = cur.fetchone()[0]
            print(f"\n📊 DB에 등록된 광역버스: {count}개")

            # 광역버스 목록 출력
            cur.execute("""
                SELECT route_id, route_name
                FROM routes
                WHERE route_type = '1' AND climate_card_eligible = true
                ORDER BY route_name;
            """)

            print(f"\n🚌 광역버스 목록:")
            for row in cur.fetchall():
                print(f"   - {row[1]} (ID: {row[0]})")

    finally:
        conn.close()
        print("\n✅ Database connection closed")

if __name__ == '__main__':
    main()
