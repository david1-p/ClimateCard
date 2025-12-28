#!/usr/bin/env python3
"""
서울 열린데이터광장에서 다운로드한 '서울시 버스운행노선 정보' 엑셀 파일을 파싱하여
route_stations 테이블에 데이터를 import하는 스크립트

사용 방법:
1. https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do 접속
2. 최신 '서울시버스노선기본정보' Excel 파일 다운로드
3. 다운로드한 파일을 data/ 디렉토리에 저장
4. python3 scripts/import_seoul_bus_routes_excel.py <파일경로>
"""

import sys
import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# DB 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'climate_transport'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '1q2w')
}


def get_missing_routes(conn):
    """정류소 연결이 없는 기후동행카드 적용 노선 조회"""
    query = """
    SELECT r.route_id, r.route_name, r.route_type
    FROM routes r
    WHERE r.climate_card_eligible = true
    AND NOT EXISTS (
      SELECT 1 FROM route_stations rs WHERE rs.route_id = r.route_id
    )
    ORDER BY r.route_type, r.route_name
    """

    with conn.cursor() as cur:
        cur.execute(query)
        return {row[1]: row[0] for row in cur.fetchall()}  # {route_name: route_id}


def parse_excel_file(file_path):
    """
    엑셀 파일 파싱

    예상 필드:
    - 노선ID or 노선번호
    - 노선명
    - 정류소ID or ARS번호
    - 정류소명
    - 정류소순서 or 순번
    """
    print(f"\n📄 엑셀 파일 읽는 중: {file_path}")

    # 모든 시트 확인
    xl = pd.ExcelFile(file_path)
    print(f"✅ 시트 목록: {xl.sheet_names}")

    all_data = []

    for sheet_name in xl.sheet_names:
        print(f"\n📋 시트 '{sheet_name}' 파싱 중...")
        df = pd.read_excel(file_path, sheet_name=sheet_name)

        print(f"   행 개수: {len(df)}")
        print(f"   열 목록: {df.columns.tolist()}")

        # 필드명 정규화 (다양한 형태 지원)
        df.columns = df.columns.str.strip().str.lower()

        # 필드 매핑 (가능한 모든 경우의 수)
        route_id_col = None
        route_name_col = None
        station_id_col = None
        station_name_col = None
        sequence_col = None

        for col in df.columns:
            # 노선 ID
            if '노선id' in col or 'routeid' in col or '노선번호' in col:
                route_id_col = col
            # 노선명
            elif '노선명' in col or 'routename' in col or '버스번호' in col:
                route_name_col = col
            # 정류소 ID
            elif '정류소id' in col or 'stationid' in col or 'arsid' in col or 'ars' in col:
                station_id_col = col
            # 정류소명
            elif '정류소명' in col or 'stationname' in col or '정류장명' in col:
                station_name_col = col
            # 순서
            elif '순서' in col or 'seq' in col or '순번' in col or 'order' in col:
                sequence_col = col

        print(f"   매핑된 필드:")
        print(f"     - 노선ID: {route_id_col}")
        print(f"     - 노선명: {route_name_col}")
        print(f"     - 정류소ID: {station_id_col}")
        print(f"     - 정류소명: {station_name_col}")
        print(f"     - 순서: {sequence_col}")

        if not route_name_col or not station_id_col:
            print(f"⚠️  필수 필드가 없어서 스킵합니다.")
            continue

        # 데이터 추출
        for idx, row in df.iterrows():
            route_name = str(row[route_name_col]).strip() if pd.notna(row[route_name_col]) else None
            station_id = str(row[station_id_col]).strip() if pd.notna(row[station_id_col]) else None

            if not route_name or not station_id:
                continue

            # 순서 (없으면 0)
            sequence = 0
            if sequence_col and pd.notna(row[sequence_col]):
                try:
                    sequence = int(row[sequence_col])
                except:
                    pass

            all_data.append({
                'route_name': route_name,
                'station_id': station_id,
                'sequence': sequence
            })

    print(f"\n✅ 총 {len(all_data)}개 노선-정류소 연결 데이터 파싱 완료")
    return all_data


def import_to_db(conn, data, missing_routes):
    """
    파싱한 데이터를 DB에 저장
    기후동행카드 적용 노선만 필터링
    """
    print(f"\n📡 DB에 데이터 저장 중...")

    inserted = 0
    skipped = 0
    error_count = 0

    with conn.cursor() as cur:
        for item in data:
            route_name = item['route_name']
            station_id = item['station_id']
            sequence = item['sequence']

            # 기후동행카드 적용 노선만 처리
            if route_name not in missing_routes:
                skipped += 1
                continue

            route_id = missing_routes[route_name]

            try:
                cur.execute("""
                    INSERT INTO route_stations (route_id, station_id, sequence)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (route_id, station_id) DO UPDATE SET sequence = %s
                """, (route_id, station_id, sequence, sequence))

                inserted += 1

                if inserted % 100 == 0:
                    print(f"   진행 중: {inserted}개 저장됨...")

            except Exception as e:
                error_count += 1
                # 정류소가 stations 테이블에 없는 경우 무시

        conn.commit()

    print(f"\n✅ 저장 완료!")
    print(f"   - 성공: {inserted}개")
    print(f"   - 스킵 (기후동행카드 미적용): {skipped}개")
    print(f"   - 에러 (정류소 미존재): {error_count}개")

    return inserted


def main():
    if len(sys.argv) < 2:
        print("사용법: python3 scripts/import_seoul_bus_routes_excel.py <엑셀파일경로>")
        print("\n예시:")
        print("  python3 scripts/import_seoul_bus_routes_excel.py data/서울시버스노선기본정보.xlsx")
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
        sys.exit(1)

    print("=" * 80)
    print("🚀 서울시 버스운행노선 정보 Import")
    print("=" * 80)

    # DB 연결
    print("\n📡 DB 연결 중...")
    conn = psycopg2.connect(**DB_CONFIG)
    print("✅ DB 연결 성공")

    try:
        # 누락된 노선 조회
        print("\n📋 정류소 연결이 없는 기후동행카드 노선 조회 중...")
        missing_routes = get_missing_routes(conn)
        print(f"✅ {len(missing_routes)}개 노선 발견")

        if not missing_routes:
            print("\n🎉 모든 노선에 정류소 연결이 있습니다!")
            return

        print(f"\n   누락된 노선 샘플 (처음 10개):")
        for route_name in list(missing_routes.keys())[:10]:
            print(f"     - {route_name}")

        # 엑셀 파일 파싱
        data = parse_excel_file(file_path)

        if not data:
            print("\n❌ 파싱된 데이터가 없습니다.")
            return

        # DB에 저장
        inserted = import_to_db(conn, data, missing_routes)

        if inserted > 0:
            print("\n" + "=" * 80)
            print("🎉 Import 완료!")
            print("=" * 80)

            # 남은 누락 노선 확인
            remaining = get_missing_routes(conn)
            print(f"\n📊 통계:")
            print(f"   - 처리 전: {len(missing_routes)}개 노선 누락")
            print(f"   - 저장됨: {inserted}개 정류소 연결")
            print(f"   - 처리 후: {len(remaining)}개 노선 여전히 누락")

            if remaining:
                print(f"\n⚠️  여전히 {len(remaining)}개 노선의 정류소가 누락되어 있습니다.")
                print(f"   샘플 (처음 10개):")
                for route_name in list(remaining.keys())[:10]:
                    print(f"     - {route_name}")

    finally:
        conn.close()


if __name__ == '__main__':
    main()
