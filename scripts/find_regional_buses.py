#!/usr/bin/env python3
"""
서울 공공데이터 API에서 경기/인천 광역버스 검색
"""
import os
import requests
import xml.etree.ElementTree as ET

SERVICE_KEY = os.getenv('PUBLIC_API_SERVICE_KEY', '148ff0c05b53284fd7738e5d3b241d132c8b81138098dcc1009f11f70d9ee16c')

# 검색할 경기/인천 광역버스 목록
BUSES_TO_SEARCH = [
    # 인천 광역버스
    '1300', '1301', '1302', '1400', '1500', '1601',
    # 경기 광역버스
    '9000', '9001', '9002', '9003', '9100', '9200', '9300', '9400',
    'M5107', 'M5115', 'M5121', 'M5422', 'M5443',
]

def search_bus(bus_number):
    """서울 공공데이터 API에서 버스 검색"""
    url = "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList"
    params = {
        'serviceKey': SERVICE_KEY,
        'strSrch': bus_number
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        root = ET.fromstring(response.content)
        items = root.findall('.//itemList')

        results = []
        for item in items:
            route_name = item.find('busRouteNm').text
            route_id = item.find('busRouteId').text
            route_type = item.find('routeType').text

            # 인천, 경기 관련 키워드가 있는지 확인
            if any(keyword in route_name.lower() for keyword in ['인천', '경기', 'gy', 'ic']):
                results.append({
                    'route_name': route_name,
                    'route_id': route_id,
                    'route_type': route_type
                })
            elif bus_number in route_name:
                results.append({
                    'route_name': route_name,
                    'route_id': route_id,
                    'route_type': route_type
                })

        return results

    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return []

def main():
    print("=" * 60)
    print("경기/인천 광역버스 검색 (서울 공공데이터 API)")
    print("=" * 60)

    all_found_buses = []

    for bus_number in BUSES_TO_SEARCH:
        print(f"\n🔍 {bus_number}번 버스 검색 중...")
        results = search_bus(bus_number)

        if results:
            for result in results:
                print(f"   ✅ 노선명: {result['route_name']}")
                print(f"      ROUTEID: {result['route_id']}")
                print(f"      노선유형: {result['route_type']}")
                all_found_buses.append(result)
        else:
            print(f"   ❌ 찾을 수 없음")

    # 요약
    print("\n" + "=" * 60)
    print(f"📊 검색 요약:")
    print(f"   - 검색한 노선: {len(BUSES_TO_SEARCH)}개")
    print(f"   - 찾은 노선: {len(all_found_buses)}개")

    if all_found_buses:
        print(f"\n✅ 찾은 노선 목록 (Python 코드 형식):")
        print("REGIONAL_BUSES = [")
        for bus in all_found_buses:
            print(f"    ('{bus['route_id']}', '{bus['route_name']}', '1', '인천광역시/경기도'),")
        print("]")

if __name__ == '__main__':
    main()
