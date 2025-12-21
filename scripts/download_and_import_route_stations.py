#!/usr/bin/env python3
"""
서울시 공개 데이터에서 노선별 정류소 정보 다운로드 및 DB 임포트
"""
import os
import requests
import psycopg2
import pandas as pd
from io import BytesIO

# 환경 변수
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')

# 다운로드 URL (data.seoul.go.kr 에서 확인 필요)
# 이 URL은 실제 다운로드 링크로 교체해야 함
DOWNLOAD_URL = "https://data.seoul.go.kr/dataList/OA-1095/F/1/datasetView.do"


def download_excel_file(url):
    """
    Excel 파일 다운로드
    """
    print(f"📥 Downloading from: {url}")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)

        if response.status_code == 200:
            print("✅ Download successful")
            return BytesIO(response.content)
        else:
            print(f"❌ HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Download error: {e}")
        return None


def parse_excel_and_import(excel_data, conn):
    """
    Excel 파일 파싱 및 DB 임포트
    """
    try:
        # Excel 파일 읽기
        print("📊 Parsing Excel file...")
        df = pd.read_excel(excel_data)

        print(f"✅ Found {len(df)} rows")
        print(f"📋 Columns: {list(df.columns)}")
        print(f"\n🔍 First 5 rows:")
        print(df.head())

        # 우리 DB에 있는 노선 ID 목록 가져오기
        print("\n📋 Loading existing routes from database...")
        with conn.cursor() as cur:
            cur.execute("SELECT route_id FROM routes;")
            existing_routes = set(row[0] for row in cur.fetchall())
        print(f"✅ Found {len(existing_routes)} routes in database")

        # 우리 DB에 있는 정류소 ID 목록 가져오기
        print("📋 Loading existing stations from database...")
        with conn.cursor() as cur:
            cur.execute("SELECT station_id FROM stations;")
            existing_stations = set(row[0] for row in cur.fetchall())
        print(f"✅ Found {len(existing_stations)} stations in database")

        # 컬럼명 확인 후 매핑 (실제 데이터 구조에 따라 수정 필요)
        # 예상 컬럼: 노선ID, 노선명, 정류소ID, 정류소명, 순번, 방향 등

        inserted = 0
        skipped = 0
        skipped_route_not_found = 0
        stations_created = 0

        with conn.cursor() as cur:
            for idx, row in df.iterrows():
                try:
                    # 실제 컬럼명에 따라 수정 필요
                    # 여기서는 가능한 컬럼명들을 시도
                    route_id = row.get('노선ID') or row.get('노선번호') or row.get('ROUTE_ID') or row.get('BUS_ROUTE_ID')
                    station_id = row.get('정류소ID') or row.get('정류장ID') or row.get('STATION_ID') or row.get('NODE_ID')
                    station_name = row.get('정류소명') or row.get('정류장명') or row.get('STATION_NAME') or ''
                    sequence = row.get('순번') or row.get('정류소순번') or row.get('SEQUENCE') or row.get('SEQ') or 0
                    direction = row.get('방향') or row.get('진행방향') or row.get('DIRECTION') or ''
                    x_coord = row.get('X좌표') or row.get('경도') or row.get('LONGITUDE')
                    y_coord = row.get('Y좌표') or row.get('위도') or row.get('LATITUDE')

                    if pd.notna(route_id) and pd.notna(station_id):
                        # DB에 있는 노선만 처리
                        if str(route_id) not in existing_routes:
                            skipped_route_not_found += 1
                            continue

                        # 정류소가 DB에 없으면 추가
                        if str(station_id) not in existing_stations:
                            if pd.notna(x_coord) and pd.notna(y_coord) and pd.notna(station_name):
                                try:
                                    cur.execute("""
                                        INSERT INTO stations (station_id, station_name, location)
                                        VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                                        ON CONFLICT (station_id) DO NOTHING;
                                    """, (str(station_id), str(station_name), float(x_coord), float(y_coord)))

                                    if cur.rowcount > 0:
                                        existing_stations.add(str(station_id))
                                        stations_created += 1
                                except Exception as e:
                                    # 정류소 추가 실패 시 스킵
                                    continue

                        # route_stations 삽입
                        cur.execute("""
                            INSERT INTO route_stations (route_id, station_id, sequence, direction)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (route_id, station_id, sequence) DO NOTHING;
                        """, (str(route_id), str(station_id), int(sequence), str(direction)))

                        if cur.rowcount > 0:
                            inserted += 1
                        else:
                            skipped += 1
                    else:
                        skipped += 1

                except Exception as e:
                    # 조용히 스킵 (너무 많은 에러 출력 방지)
                    skipped += 1

                # 1000행마다 커밋
                if (idx + 1) % 1000 == 0:
                    conn.commit()
                    print(f"   Progress: {idx + 1}/{len(df)} rows processed")

            conn.commit()

        print(f"\n🎉 Import complete!")
        print(f"   ✅ Route-station relationships inserted: {inserted}")
        print(f"   ✅ New stations created: {stations_created}")
        print(f"   ⏭️  Skipped (duplicates): {skipped}")
        print(f"   ⏭️  Skipped (route not in DB): {skipped_route_not_found}")
        print(f"   📊 Total rows processed: {len(df)}")

        return True

    except Exception as e:
        print(f"❌ Parse error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("Seoul Bus Route-Station Data Importer")
    print("=" * 60)

    print("\n⚠️  NOTE: You need to manually download the Excel file from:")
    print("   https://data.seoul.go.kr/dataList/OA-1095/F/1/datasetView.do")
    print("\n📝 Instructions:")
    print("   1. Visit the URL above")
    print("   2. Download the latest '서울시버스노선별정류소정보' file")
    print("   3. Save it as 'route_stations.xlsx' in the scripts folder")
    print("   4. Run this script again")
    print("=" * 60)

    # 로컬 파일 확인
    local_file = '/Users/david/Desktop/기후동행/scripts/route_stations.xlsx'

    if not os.path.exists(local_file):
        print(f"\n❌ File not found: {local_file}")
        print("   Please download the file manually and try again.")
        return

    print(f"\n✅ Found local file: {local_file}")
    print("📡 Connecting to database...")

    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    try:
        # Excel 파일 읽기 및 임포트
        parse_excel_and_import(local_file, conn)

    finally:
        conn.close()
        print("\n✅ Database connection closed")


if __name__ == '__main__':
    main()
