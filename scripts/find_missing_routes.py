#!/usr/bin/env python3
"""
기후동행카드 적용 노선 중 누락된 노선 찾기
"""
import pandas as pd
import psycopg2
import os

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': 5432,
    'database': 'climate_transport',
    'user': 'postgres',
    'password': os.getenv('DB_PASSWORD', '1q2w')
}

print("=" * 80)
print("🔍 기후동행카드 적용 노선 누락 분석")
print("=" * 80)

# 1. 엑셀 데이터 로드
print("\n📁 엑셀 파일 로드 중...")
climate_routes = pd.read_excel(
    '/Users/david/Desktop/기후동행/data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx',
    sheet_name='버스'
)

route_ids = pd.read_excel(
    '/Users/david/Desktop/기후동행/data/서울시버스노선ID정보(20251209).xlsx'
)

# 노선번호 정리
climate_routes['route_name'] = climate_routes['노선\n번호'].astype(str).str.strip()
route_ids['route_name'] = route_ids['노선명'].astype(str).str.strip()

# 기후동행카드 적용 노선만 필터링
climate_only = climate_routes[climate_routes['기후동행카드 적용여부'] == 'O'].copy()
print(f"✅ 기후동행카드 적용('O') 노선: {len(climate_only)}개")

# 중복 제거된 고유 노선 이름
unique_climate_routes = climate_only['route_name'].unique()
print(f"✅ 고유 노선 수: {len(unique_climate_routes)}개")

# 2. DB에서 현재 적용 노선 조회
print("\n📊 DB에서 현재 기후동행카드 적용 노선 조회 중...")
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

cur.execute("""
    SELECT route_name
    FROM routes
    WHERE climate_card_eligible = true
""")
db_eligible_routes = set([row[0] for row in cur.fetchall()])
print(f"✅ DB에 적용된 노선: {len(db_eligible_routes)}개")

# 3. 엑셀에는 있지만 DB에는 적용 안 된 노선 찾기
print("\n" + "=" * 80)
print("🔍 엑셀에는 있지만 DB에 적용 안 된 노선")
print("=" * 80)

missing_in_db = []
for route_name in unique_climate_routes:
    if route_name not in db_eligible_routes:
        missing_in_db.append(route_name)

if missing_in_db:
    print(f"\n⚠️  총 {len(missing_in_db)}개 노선이 누락되었습니다:\n")

    # 노선ID 파일과 매칭하여 상세 정보 출력
    for route_name in sorted(missing_in_db):
        # 엑셀에서 유형 찾기
        route_info = climate_only[climate_only['route_name'] == route_name].iloc[0]
        route_type = route_info['유형']

        # 서울시 버스노선ID에서 ROUTEID 찾기
        route_id_info = route_ids[route_ids['route_name'] == route_name]

        if len(route_id_info) > 0:
            route_id = route_id_info.iloc[0]['ROUTEID']

            # DB에 해당 노선이 있는지 확인
            cur.execute("SELECT route_id, climate_card_eligible FROM routes WHERE route_id = %s", (str(int(route_id)),))
            db_route = cur.fetchone()

            if db_route:
                print(f"  ✅ {route_name:10s} ({route_type:4s}) - ROUTEID: {int(route_id):9d} - DB에 존재 (적용 필요)")
            else:
                print(f"  ❌ {route_name:10s} ({route_type:4s}) - ROUTEID: {int(route_id):9d} - DB에 없음")
        else:
            print(f"  ⚠️  {route_name:10s} ({route_type:4s}) - ROUTEID 없음 (서울시 파일에 없음)")
else:
    print("\n✅ 누락된 노선이 없습니다!")

# 4. 2312번 상세 확인
print("\n" + "=" * 80)
print("🔍 2312 관련 노선 상세 분석")
print("=" * 80)

print("\n📊 엑셀 파일에서 '2312' 포함 노선:")
related_2312 = climate_only[climate_only['route_name'].str.contains('2312', na=False)]
for idx, row in related_2312.iterrows():
    print(f"  - {row['route_name']} ({row['유형']}, 적용여부: {row['기후동행카드 적용여부']})")

print("\n📊 서울시 버스노선ID에서 '2312' 포함 노선:")
related_2312_ids = route_ids[route_ids['route_name'].str.contains('2312', na=False)]
for idx, row in related_2312_ids.iterrows():
    print(f"  - {row['route_name']} (ROUTEID: {row['ROUTEID']})")

print("\n📊 DB에서 '2312' 포함 노선:")
cur.execute("SELECT route_id, route_name, climate_card_eligible FROM routes WHERE route_name LIKE '%2312%' ORDER BY route_name")
db_2312 = cur.fetchall()
for row in db_2312:
    eligible = "적용" if row[2] else "미적용"
    print(f"  - {row[1]} (ID: {row[0]}, {eligible})")

# 5. 누락 통계
print("\n" + "=" * 80)
print("📊 누락 노선 통계")
print("=" * 80)

missing_with_id = [r for r in missing_in_db if r in route_ids['route_name'].values]
missing_without_id = [r for r in missing_in_db if r not in route_ids['route_name'].values]

print(f"\n총 누락 노선: {len(missing_in_db)}개")
print(f"  - ROUTEID 있음 (업데이트 가능): {len(missing_with_id)}개")
print(f"  - ROUTEID 없음 (수동 처리 필요): {len(missing_without_id)}개")

if missing_without_id:
    print("\nROUTEID 없는 노선 목록:")
    for route in sorted(missing_without_id)[:20]:
        route_info = climate_only[climate_only['route_name'] == route].iloc[0]
        print(f"  - {route} ({route_info['유형']})")

cur.close()
conn.close()
