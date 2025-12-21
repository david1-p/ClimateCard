#!/usr/bin/env python3
"""
서울시 버스 API를 사용하여 노선별 정류장 정보를 가져와 route_stations 테이블을 채우는 스크립트
"""

import os
import sys
import time
import requests
import psycopg2
from psycopg2.extras import execute_batch
from urllib.parse import quote
import xml.etree.ElementTree as ET

# 환경 변수 로드
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'climate_transport')
DB_USER = os.getenv('DB_USERNAME', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '1q2w')
SERVICE_KEY = os.getenv('PUBLIC_API_SERVICE_KEY', '')

# API 설정
API_BASE_URL = "http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute"

def get_db_connection():
    """PostgreSQL 데이터베이스 연결"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"❌ DB 연결 실패: {e}")
        sys.exit(1)

def fetch_all_routes(conn):
    """DB에서 모든 노선 조회"""
    cursor = conn.cursor()
    cursor.execute("SELECT route_id, route_name FROM routes ORDER BY route_name")
    routes = cursor.fetchall()
    cursor.close()
    return routes

def fetch_stations_for_route(route_id, service_key):
    """서울시 API에서 특정 노선의 정류장 정보 조회"""
    url = f"{API_BASE_URL}?ServiceKey={quote(service_key)}&busRouteId={route_id}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        # XML 파싱
        root = ET.fromstring(response.content)

        # 헤더 정보 확인
        header_msg = root.find('.//headerMsg')
        if header_msg is not None and header_msg.text != '정상적으로 처리되었습니다.':
            return None, f"API 에러: {header_msg.text}"

        # msgBody 확인
        msg_body = root.find('.//msgBody')
        if msg_body is None:
            return None, "응답에 msgBody가 없습니다"

        # 정류장 목록 추출
        stations = []
        for item in msg_body.findall('.//itemList'):
            station_id = item.find('station')
            station_seq = item.find('seq')
            station_name = item.find('stationNm')

            if station_id is not None and station_seq is not None:
                stations.append({
                    'station_id': station_id.text,
                    'sequence': int(station_seq.text),
                    'station_name': station_name.text if station_name is not None else ''
                })

        return stations, None

    except requests.RequestException as e:
        return None, f"요청 실패: {str(e)}"
    except ET.ParseError as e:
        return None, f"XML 파싱 실패: {str(e)}"
    except Exception as e:
        return None, f"알 수 없는 에러: {str(e)}"

def insert_route_stations(conn, route_id, stations):
    """route_stations 테이블에 데이터 삽입"""
    cursor = conn.cursor()

    # 기존 데이터 삭제 (중복 방지)
    cursor.execute("DELETE FROM route_stations WHERE route_id = %s", (route_id,))

    # 새 데이터 삽입
    insert_query = """
        INSERT INTO route_stations (route_id, station_id, station_sequence, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW())
        ON CONFLICT (route_id, station_id) DO NOTHING
    """

    data = [(route_id, station['station_id'], station['sequence']) for station in stations]
    execute_batch(cursor, insert_query, data)

    conn.commit()
    cursor.close()
    return len(data)

def main():
    """메인 실행 함수"""
    if not SERVICE_KEY:
        print("❌ 환경 변수 PUBLIC_API_SERVICE_KEY가 설정되지 않았습니다.")
        print("💡 .env 파일을 확인하거나 환경 변수를 설정해주세요.")
        sys.exit(1)

    print("🚀 서울시 버스 API로 route_stations 데이터 수집 시작\n")
    print(f"📊 DB: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"🔑 API Key: {SERVICE_KEY[:20]}...\n")

    # DB 연결
    conn = get_db_connection()
    print("✅ DB 연결 성공\n")

    # 모든 노선 조회
    routes = fetch_all_routes(conn)
    total_routes = len(routes)
    print(f"📋 총 {total_routes}개 노선 발견\n")

    # 통계
    success_count = 0
    error_count = 0
    total_stations = 0

    # 각 노선에 대해 처리
    for idx, (route_id, route_name) in enumerate(routes, 1):
        print(f"[{idx}/{total_routes}] 노선 {route_name} ({route_id}) 처리 중...", end=" ")

        # API 호출
        stations, error = fetch_stations_for_route(route_id, SERVICE_KEY)

        if error:
            print(f"❌ {error}")
            error_count += 1
        elif not stations:
            print(f"⚠️  정류장 정보 없음")
            error_count += 1
        else:
            # DB 저장
            try:
                inserted = insert_route_stations(conn, route_id, stations)
                total_stations += inserted
                success_count += 1
                print(f"✅ {inserted}개 정류장 저장")
            except Exception as e:
                print(f"❌ DB 저장 실패: {e}")
                error_count += 1

        # API 호출 제한 준수 (초당 10회)
        time.sleep(0.1)

        # 진행 상황 출력 (매 50개마다)
        if idx % 50 == 0:
            print(f"\n📊 중간 집계: 성공 {success_count}, 실패 {error_count}, 정류장 {total_stations}개\n")

    # 최종 결과
    conn.close()
    print("\n" + "="*60)
    print("🎉 처리 완료!")
    print(f"✅ 성공: {success_count}개 노선")
    print(f"❌ 실패: {error_count}개 노선")
    print(f"🚏 총 {total_stations}개 정류장 매핑 데이터 저장")
    print("="*60)

if __name__ == "__main__":
    main()
