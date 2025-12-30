#!/usr/bin/env python3
"""
주요 지역별 샘플 데이터 생성
기후동행카드 주요 노선과 주요 정류소 매핑
"""
import psycopg2
from psycopg2.extras import execute_batch

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': '1q2w'
}

# 주요 지역별 대표 정류소와 경유 노선 (실제 서울시 버스 정보 기반)
SAMPLE_MAPPINGS = [
    # === 시청/광화문 지역 ===
    # 140번 (간선)
    ('100100019', '101000290', 1),   # 시청앞.덕수궁
    ('100100019', '101900006', 2),   # 프레스센터
    ('100100019', '100000034', 3),   # 광화문.광화문빌딩
    ('100100019', '100000025', 4),   # 광화문

    # 141번 (간선)
    ('100100020', '101000290', 1),   # 시청앞.덕수궁
    ('100100020', '101900011', 2),   # 시청역
    ('100100020', '100000034', 3),   # 광화문

    # 146번 (간선)
    ('100100025', '101000290', 1),   # 시청앞.덕수궁
    ('100100025', '101900011', 2),   # 시청역
    ('100100025', '101900006', 3),   # 프레스센터

    # 01A (순환)
    ('100100001', '101000290', 1),   # 시청앞.덕수궁
    ('100100001', '101900006', 2),   # 프레스센터

    # 01B (순환)
    ('106000004', '101000290', 1),   # 시청앞.덕수궁
    ('106000004', '101900011', 2),   # 시청역

    # 더 많은 샘플을 추가하려면 여기에 계속 추가...
    # 형식: (노선ID, 정류소ID, 순번)
]

def clear_existing_data():
    """기존 샘플 데이터 삭제"""
    print("🗑️  Clearing existing sample data...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("TRUNCATE TABLE route_stations;")
    conn.commit()

    cur.close()
    conn.close()
    print("✅ Cleared")

def insert_sample_data():
    """샘플 데이터 삽입"""
    print(f"\n💾 Inserting {len(SAMPLE_MAPPINGS)} sample mappings...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    query = """
        INSERT INTO route_stations (route_id, station_id, sequence)
        VALUES (%s, %s, %s)
        ON CONFLICT (route_id, station_id)
        DO UPDATE SET sequence = EXCLUDED.sequence
    """

    try:
        execute_batch(cur, query, SAMPLE_MAPPINGS, page_size=1000)
        conn.commit()
        print(f"✅ Successfully inserted {len(SAMPLE_MAPPINGS)} mappings")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

def verify_data():
    """데이터 확인"""
    print("\n📊 Verifying inserted data...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 전체 개수
    cur.execute("SELECT COUNT(*) FROM route_stations")
    total = cur.fetchone()[0]
    print(f"  Total mappings: {total}")

    # 노선별 통계
    cur.execute("""
        SELECT r.route_name, COUNT(*) as station_count
        FROM route_stations rs
        JOIN routes r ON rs.route_id = r.route_id
        GROUP BY r.route_name
        ORDER BY r.route_name
    """)

    print("\n  Stations per route:")
    for route_name, count in cur.fetchall():
        print(f"    {route_name}: {count} stations")

    cur.close()
    conn.close()

def main():
    print("🚀 Creating expanded sample data...\n")

    user_input = input("⚠️  This will clear existing data. Continue? (y/N): ")
    if user_input.lower() != 'y':
        print("Cancelled.")
        return

    clear_existing_data()
    insert_sample_data()
    verify_data()

    print("\n🎉 Done! Now test the frontend.")

if __name__ == "__main__":
    main()
