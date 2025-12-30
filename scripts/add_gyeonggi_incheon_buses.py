#!/usr/bin/env python3
"""
경기/인천 광역버스를 DB에 추가
기후동행카드 적용 대상이 아님 (climate_card_eligible = false)
"""
import os
import psycopg2

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

# 경기/인천 광역버스 목록
# 형식: (ROUTEID, 노선명, 노선유형, 지역명)
REGIONAL_BUSES = [
    # 인천 광역버스
    ('165000149', '1300인천', '1', '인천광역시'),
    ('165000150', '1301인천', '1', '인천광역시'),
    ('165000421', '1302인천', '1', '인천광역시'),
    ('165000151', '1400인천', '1', '인천광역시'),
    ('165000152', '1500인천', '1', '인천광역시'),
    ('165000154', '1601인천', '1', '인천광역시'),
    ('165000160', '9100인천', '1', '인천광역시'),
    ('165000161', '9200인천', '1', '인천광역시'),
    ('165000162', '9300인천', '1', '인천광역시'),

    # 경기 양주
    ('235000116', 'G1300N양주', '1', '경기도 양주시'),
    ('235000092', 'G1300양주', '1', '경기도 양주시'),

    # 경기 고양
    ('218000174', '1500(예약)고양', '1', '경기도 고양시'),
    ('218000010', '1500고양', '1', '경기도 고양시'),

    # 경기 광주
    ('234000313', '1500-2광주', '1', '경기도 광주시'),
    ('234001574', '9000-1광주', '1', '경기도 광주시'),
    ('234000002', '9000광주', '1', '경기도 광주시'),
    ('234000886', '9300광주', '1', '경기도 광주시'),
    ('234001243', 'M5107광주', '1', '경기도 광주시'),
    ('234001286', 'M5115광주', '1', '경기도 광주시'),
    ('234001317', 'M5121광주', '1', '경기도 광주시'),
    ('234001318', 'M5422광주', '1', '경기도 광주시'),

    # 경기 성남
    ('204000191', '9000(예약)성남', '1', '경기도 성남시'),
    ('204000046', '9003성남', '1', '경기도 성남시'),
    ('204000141', '9200성남', '1', '경기도 성남시'),
    ('204000153', '9400성남', '1', '경기도 성남시'),

    # 경기 수원
    ('200000335', 'M5107(예약)수원', '1', '경기도 수원시'),
    ('200000336', 'M5115(예약)수원', '1', '경기도 수원시'),
    ('200000334', 'M5422(예약)수원', '1', '경기도 수원시'),
    ('200000326', 'M5443(예약)수원', '1', '경기도 수원시'),
    ('200000325', 'M5443수원', '1', '경기도 수원시'),
]

def main():
    print("=" * 60)
    print("경기/인천 광역버스 추가")
    print("=" * 60)

    print(f"\n📋 {len(REGIONAL_BUSES)}개 노선 추가 중...\n")

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

        with conn.cursor() as cur:
            for route_id, route_name, route_type, region_name in REGIONAL_BUSES:
                try:
                    # 기후동행카드 적용 대상이 아님 (climate_card_eligible = false)
                    cur.execute("""
                        INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, region_name)
                        VALUES (%s, %s, %s, false, %s)
                        ON CONFLICT (route_id) DO UPDATE SET
                            climate_card_eligible = false,
                            route_type = EXCLUDED.route_type,
                            region_name = EXCLUDED.region_name;
                    """, (route_id, route_name, route_type, region_name))

                    if cur.rowcount > 0:
                        print(f"   ✅ {route_name:20s} ({region_name:15s}) - ID: {route_id}")
                        inserted += 1

                except Exception as e:
                    print(f"   ⚠️  {route_name} error: {e}")

            conn.commit()

        print(f"\n🎉 추가 완료!")
        print(f"   ✅ 총 처리: {len(REGIONAL_BUSES)}개")
        print(f"   📊 추가/업데이트: {inserted}개")

        # 지역별 통계
        with conn.cursor() as cur:
            cur.execute("""
                SELECT region_name, COUNT(*) as count
                FROM routes
                WHERE climate_card_eligible = false
                GROUP BY region_name
                ORDER BY region_name;
            """)

            print(f"\n📊 기후동행카드 미적용 노선 (지역별):")
            for row in cur.fetchall():
                print(f"   - {row[0]}: {row[1]}개")

        # 전체 통계
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM routes WHERE climate_card_eligible = true")
            eligible_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM routes WHERE climate_card_eligible = false")
            ineligible_count = cur.fetchone()[0]

            print(f"\n📊 전체 통계:")
            print(f"   - 기후동행카드 적용: {eligible_count}개 (서울시 면허)")
            print(f"   - 기후동행카드 미적용: {ineligible_count}개 (경기/인천)")
            print(f"   - 총 노선: {eligible_count + ineligible_count}개")

    finally:
        conn.close()
        print("\n✅ Database connection closed")

if __name__ == '__main__':
    main()
