#!/usr/bin/env python3
"""
기후동행카드 적용 광역버스 목록 확인
"""
import pandas as pd

excel_file = '/Users/david/Desktop/기후동행/data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx'

print("=" * 60)
print("기후동행카드 적용 광역버스 목록 확인")
print("=" * 60)

# 시트 목록 확인
xl_file = pd.ExcelFile(excel_file)
print(f"\n📋 시트 목록: {xl_file.sheet_names}\n")

# '버스' 시트 읽기
df = pd.read_excel(excel_file, sheet_name='버스')
print(f"✅ 전체 버스 데이터: {len(df)}개 행")
print(f"📊 컬럼: {list(df.columns)}\n")

# 유형별 분류
if '유형' in df.columns:
    print("📊 유형별 분류:")
    print(df['유형'].value_counts())
    print()

    # 광역버스만 필터링
    express_buses = df[df['유형'] == '광역']
    print(f"\n🚌 광역버스: {len(express_buses)}개")
    print("=" * 60)

    # 광역버스 목록 출력
    for idx, row in express_buses.iterrows():
        route_num = row.get('노선\n번호', row.get('노선번호', 'N/A'))
        print(f"노선번호: {route_num}")
        print(f"  - 유형: {row.get('유형', 'N/A')}")
        print(f"  - 업체명: {row.get('업체명', 'N/A')}")
        print(f"  - 기점: {row.get('기점', 'N/A')}")
        print(f"  - 종점: {row.get('종점', 'N/A')}")
        print()
else:
    print("⚠️ '유형' 컬럼을 찾을 수 없습니다.")
    print(f"사용 가능한 컬럼: {list(df.columns)}")
    print("\n샘플 데이터:")
    print(df.head(10))
