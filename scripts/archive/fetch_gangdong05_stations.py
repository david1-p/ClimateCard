#!/usr/bin/env python3
"""
서울시 API로 강동05 노선의 정류소 목록 조회
"""
import requests
import xml.etree.ElementTree as ET
import os

SEOUL_API_KEY = os.getenv('SEOUL_API_KEY', '676c6e765563643539384142745556')
SEOUL_API_BASE = 'http://openapi.seoul.go.kr:8088'

# 강동05 노선 ID
ROUTE_ID = '124900001'

print("=" * 80)
print("🔍 강동05 노선 정류소 목록 조회 (서울시 API)")
print("=" * 80)

url = f"{SEOUL_API_BASE}/{SEOUL_API_KEY}/xml/busRouteStationInfo/1/1000/{ROUTE_ID}"

print(f"\n📡 API 호출: {url}\n")

try:
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    root = ET.fromstring(response.content)

    # 에러 체크
    result_code = root.find('RESULT/CODE')
    result_msg = root.find('RESULT/MESSAGE')

    if result_code is not None:
        print(f"응답 코드: {result_code.text}")
        print(f"응답 메시지: {result_msg.text if result_msg is not None else 'N/A'}")

    # 정류소 목록 추출
    stations = []
    for row in root.findall('row'):
        station_id = row.find('STATION_ID')
        station_nm = row.find('STATION_NM')
        station_seq = row.find('STATION_SEQ')

        if station_id is not None and station_seq is not None:
            stations.append({
                'station_id': station_id.text,
                'station_name': station_nm.text if station_nm is not None else 'N/A',
                'sequence': int(station_seq.text)
            })

    if stations:
        print(f"\n✅ 총 {len(stations)}개 정류소 발견\n")
        print("정류소 목록 (처음 20개):")
        for station in stations[:20]:
            print(f"  {station['sequence']:3d}. {station['station_name']} (ID: {station['station_id']})")

        # 25557 정류소 확인
        print("\n🔍 고분다리(25557) 정류소 확인:")
        found_25557 = False
        for station in stations:
            if '고분다리' in station['station_name']:
                print(f"  ✅ {station['station_name']} (ID: {station['station_id']}, 순서: {station['sequence']})")
                if station['station_id'] == '124900001':
                    found_25557 = True

        if not found_25557:
            print("  ⚠️  정류장 ID가 정확히 매칭되지 않을 수 있습니다.")
    else:
        print("\n❌ 정류소 정보가 없습니다!")
        print("\nXML 응답 전문:")
        print(ET.tostring(root, encoding='unicode'))

except Exception as e:
    print(f"\n❌ API 호출 실패: {e}")
