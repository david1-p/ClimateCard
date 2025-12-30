#!/usr/bin/env python3
"""
광역버스 노선 ID 찾기
"""
import pandas as pd

route_id_file = '/Users/david/Desktop/기후동행/data/서울시버스노선ID정보(20251209).xlsx'

# 광역버스 목록 (중복 제거)
express_routes = [
    '9401', '9404', '9408', '9409', '9707', '9711', '9401-1',
    '서울01출근', '서울01퇴근', '서울03출근', '서울03퇴근', '서울06출근', '서울06퇴근'
]

print("=" * 60)
print("광역버스 노선 ID 찾기")
print("=" * 60)

# 엑셀 파일 읽기
df = pd.read_excel(route_id_file)
print(f"\n✅ 전체 노선 데이터: {len(df)}개")
print(f"📊 컬럼: {list(df.columns)}\n")

print(f"🔍 광역버스 {len(express_routes)}개 노선 검색 중...\n")
print("=" * 60)

found_routes = []
not_found_routes = []

for route_name in express_routes:
    # 노선명으로 검색
    matches = df[df['노선명'] == route_name]

    if len(matches) > 0:
        print(f"✅ {route_name}")
        for idx, row in matches.iterrows():
            route_id = row['ROUTEID']
            found_routes.append({
                'route_id': route_id,
                'route_name': route_name
            })
            print(f"   - ROUTEID: {route_id}")
    else:
        not_found_routes.append(route_name)
        print(f"❌ {route_name} - 찾을 수 없음")

print("\n" + "=" * 60)
print(f"📊 요약:")
print(f"   ✅ 찾은 노선: {len(found_routes)}개")
print(f"   ❌ 못 찾은 노선: {len(not_found_routes)}개")

if not_found_routes:
    print(f"\n❌ 못 찾은 노선 목록:")
    for route in not_found_routes:
        print(f"   - {route}")

    # 비슷한 이름 검색
    print(f"\n🔍 유사한 노선명 검색:")
    for route in not_found_routes:
        # 부분 일치 검색
        partial_matches = df[df['노선명'].astype(str).str.contains(route.split('출근')[0].split('퇴근')[0], na=False)]
        if len(partial_matches) > 0:
            print(f"\n   '{route}'와 유사한 노선:")
            for idx, row in partial_matches.head(5).iterrows():
                print(f"      - {row['노선명']} (ROUTEID: {row['ROUTEID']})")
