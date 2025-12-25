#!/usr/bin/env python3
"""
누락된 기후동행카드 적용 노선 업데이트
"""
import psycopg2
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

# 업데이트 필요한 ROUTEID 목록 (고유 17개)
ROUTE_IDS_TO_UPDATE = [
    ('100100598', '2115'),    # 2115A, 2115B
    ('100100611', '2312'),    # 2312A, 2312B ⭐ 문제의 2312
    ('112000003', '8773'),    # 8773구산, 8773홍대
    ('113000007', '8775'),    # 8775출근, 8775톼근
    ('100100593', 'N13'),     # N13상계, N13송파
    ('100100610', 'N15'),     # N15사당, N15우이
    ('100100592', 'N16'),     # N16도봉, N16온수
    ('100100586', 'N26'),     # N26강서, N26중랑
    ('104000011', 'N31'),     # N31강동, N31정릉
    ('100100585', 'N37'),     # N37송파, N37진관
    ('117000002', 'N51'),     # N51시흥, N51하계
    ('100100589', 'N61'),     # N61상계, N61양천
    ('100100588', 'N62'),     # N62면목, N62양천
    ('115000010', 'N64'),     # N64강서, N64염곡
    ('111000017', 'N72'),     # N72은평, N72중랑
    ('123000013', 'N73'),     # N73구산, N73송파
    ('111000016', 'N75'),     # N75신림, N75진관
]

def update_missing_routes():
    """누락된 노선 업데이트"""
    print("=" * 80)
    print("🚀 누락된 기후동행카드 적용 노선 업데이트 시작")
    print("=" * 80)

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        print(f"\n총 {len(ROUTE_IDS_TO_UPDATE)}개 노선을 업데이트합니다...\n")

        updated_count = 0

        for route_id, route_name in ROUTE_IDS_TO_UPDATE:
            # 현재 상태 확인
            cur.execute("""
                SELECT route_name, climate_card_eligible
                FROM routes
                WHERE route_id = %s
            """, (route_id,))

            result = cur.fetchone()

            if result:
                current_name, current_eligible = result

                # 업데이트
                cur.execute("""
                    UPDATE routes
                    SET climate_card_eligible = true
                    WHERE route_id = %s
                """, (route_id,))

                if cur.rowcount > 0:
                    status = "이미 적용" if current_eligible else "업데이트 완료"
                    emoji = "✅" if not current_eligible else "ℹ️"
                    print(f"  {emoji} {route_name:10s} (ID: {route_id}) - {status}")
                    if not current_eligible:
                        updated_count += 1
                else:
                    print(f"  ❌ {route_name:10s} (ID: {route_id}) - 업데이트 실패")
            else:
                print(f"  ⚠️  {route_name:10s} (ID: {route_id}) - DB에 없음")

        conn.commit()

        print(f"\n" + "=" * 80)
        print(f"✅ {updated_count}개 노선이 새로 업데이트되었습니다")
        print("=" * 80)

        # 업데이트 후 통계
        print("\n📊 업데이트 후 전체 통계:")
        cur.execute("""
            SELECT climate_card_eligible, COUNT(*)
            FROM routes
            GROUP BY climate_card_eligible
            ORDER BY climate_card_eligible
        """)

        stats = cur.fetchall()
        for stat in stats:
            eligible = "적용" if stat[0] else "미적용"
            print(f"  - {eligible}: {stat[1]}개")

        # 2312번 확인
        print("\n🔍 2312번 노선 최종 확인:")
        cur.execute("""
            SELECT route_id, route_name, route_type, climate_card_eligible
            FROM routes
            WHERE route_name = '2312'
        """)

        route_2312 = cur.fetchone()
        if route_2312:
            eligible = "적용" if route_2312[3] else "미적용"
            print(f"  - ID: {route_2312[0]}, 이름: {route_2312[1]}, 유형: {route_2312[2]}, 기후동행카드: {eligible}")

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_missing_routes()
