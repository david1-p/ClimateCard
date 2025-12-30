#!/usr/bin/env python3
"""
기후동행카드 적용 노선 정보를 데이터베이스에 업데이트하는 스크립트
(정류소 정보는 제외하고 노선 정보만 업데이트)
"""
import pandas as pd
import psycopg2
import os

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

def load_excel_data():
    """엑셀 파일에서 데이터 로드"""
    print("📁 엑셀 파일 로드 중...")

    # 기후동행카드 적용 노선
    climate_routes = pd.read_excel(
        '/Users/david/Desktop/기후동행/data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx',
        sheet_name='버스'
    )

    # 서울시 버스노선ID 정보
    route_ids = pd.read_excel(
        '/Users/david/Desktop/기후동행/data/서울시버스노선ID정보(20251209).xlsx'
    )

    print(f"✅ 기후동행카드 적용 노선: {len(climate_routes)}개")
    print(f"✅ 서울시 버스노선ID: {len(route_ids)}개")

    return climate_routes, route_ids

def merge_route_data(climate_routes, route_ids):
    """노선 데이터 병합"""
    print("\n🔗 노선 데이터 병합 중...")

    # 노선번호 컬럼명 정리
    climate_routes['route_name'] = climate_routes['노선\n번호'].astype(str).str.strip()
    route_ids['route_name'] = route_ids['노선명'].astype(str).str.strip()

    # 기후동행카드 적용 노선만 필터링
    climate_only = climate_routes[climate_routes['기후동행카드 적용여부'] == 'O'].copy()

    # 매칭
    merged = climate_only.merge(route_ids, on='route_name', how='left')

    print(f"✅ 병합 완료: {len(merged)}개")
    print(f"⚠️  ROUTEID 없음: {merged['ROUTEID'].isna().sum()}개")

    return merged

def update_routes_in_db(merged_routes):
    """데이터베이스에 노선 정보 업데이트"""
    print("\n💾 데이터베이스 업데이트 중...")

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        updated_count = 0
        skipped_count = 0

        for _, row in merged_routes.iterrows():
            if pd.isna(row['ROUTEID']):
                skipped_count += 1
                continue

            route_id = str(int(row['ROUTEID']))
            route_name = row['route_name']

            try:
                # climate_card_eligible을 true로 업데이트
                cur.execute("""
                    UPDATE routes
                    SET climate_card_eligible = true
                    WHERE route_id = %s
                """, (route_id,))

                if cur.rowcount > 0:
                    updated_count += 1
                    if updated_count % 50 == 0:
                        print(f"  ✅ {updated_count}개 노선 업데이트...")
                else:
                    # 노선이 DB에 없는 경우
                    print(f"  ⚠️  노선 '{route_name}' (ID: {route_id})가 DB에 없습니다.")

            except Exception as e:
                print(f"  ❌ 노선 '{route_name}' 업데이트 오류: {e}")
                conn.rollback()
                continue

        conn.commit()
        print(f"\n✅ 성공적으로 {updated_count}개 노선 업데이트 완료")
        print(f"⚠️  ROUTEID가 없어서 스킵: {skipped_count}개")

        # 업데이트 결과 통계
        print("\n" + "=" * 80)
        print("📊 업데이트 결과 통계")
        print("=" * 80)

        cur.execute("""
            SELECT climate_card_eligible, COUNT(*)
            FROM routes
            GROUP BY climate_card_eligible
            ORDER BY climate_card_eligible
        """)

        stats = cur.fetchall()
        print("\n기후동행카드 적용 여부별 노선 수:")
        for stat in stats:
            eligible = "적용" if stat[0] else "미적용"
            print(f"  - {eligible}: {stat[1]}개")

    finally:
        cur.close()
        conn.close()

def main():
    """메인 함수"""
    print("=" * 80)
    print("🚀 기후동행카드 적용 노선 데이터 업데이트 시작")
    print("=" * 80)
    print()

    # 1. 엑셀 데이터 로드
    climate_routes, route_ids = load_excel_data()

    # 2. 데이터 병합
    merged = merge_route_data(climate_routes, route_ids)

    # 3. 데이터베이스 업데이트
    update_routes_in_db(merged)

    print("\n" + "=" * 80)
    print("🎉 완료!")
    print("=" * 80)

if __name__ == "__main__":
    main()
