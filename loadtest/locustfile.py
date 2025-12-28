"""
기후동행카드 조회 시스템 - Locust 부하 테스트

실행 방법:
1. Backend 서버 시작: docker-compose --profile prod up -d backend
2. Locust 시작: docker-compose --profile loadtest up
3. 웹 브라우저에서 http://localhost:8089 접속
4. 사용자 수, 증가율 설정 후 테스트 시작

로컬 테스트:
pip install locust
locust -f locustfile.py --host=http://localhost:8080
"""

from locust import HttpUser, task, between
import random


class ClimateCardUser(HttpUser):
    """
    기후동행카드 조회 시스템 사용자 시뮬레이션

    실제 사용자 행동 패턴:
    1. GPS로 현재 위치 기반 정류소 조회 (가장 많이 사용)
    2. 노선번호로 검색
    3. 정류소 클릭해서 노선 조회
    4. 노선 상세 정보 조회
    """

    # 사용자 요청 간 대기 시간 (1~5초)
    wait_time = between(1, 5)

    # 테스트용 실제 데이터 (서울역 주변)
    test_locations = [
        {"lat": 37.5546788, "lng": 126.9709683, "name": "서울역"},
        {"lat": 37.4979, "lng": 127.0276, "name": "강남역"},
        {"lat": 37.5563, "lng": 126.9723, "name": "명동"},
        {"lat": 37.5665, "lng": 126.9780, "name": "광화문"},
        {"lat": 37.5172, "lng": 127.0473, "name": "잠실역"},
    ]

    test_route_names = [
        "421", "140", "753", "146", "162", "172",
        "261", "270", "271", "272", "273", "301"
    ]

    test_station_ids = []  # 동적으로 수집
    test_route_ids = []    # 동적으로 수집

    def on_start(self):
        """
        각 사용자가 시작할 때 실행
        초기 데이터 수집
        """
        # 서울역 주변 정류소 조회해서 테스트 데이터 수집
        response = self.client.get(
            "/api/stations/nearby",
            params={"lat": 37.5546788, "lng": 126.9709683, "radius": 500},
            name="[초기화] 주변 정류소 조회"
        )

        if response.status_code == 200:
            data = response.json()
            # 정류소 ID 수집
            if data and len(data) > 0:
                self.test_station_ids = [station["stationId"] for station in data[:10]]

    @task(10)
    def search_nearby_stations(self):
        """
        주변 정류소 조회 (가장 빈번한 요청)
        가중치: 10 (전체 요청의 약 50%)
        """
        location = random.choice(self.test_locations)
        radius = random.choice([300, 500, 1000])

        self.client.get(
            "/api/stations/nearby",
            params={
                "lat": location["lat"],
                "lng": location["lng"],
                "radius": radius
            },
            name="주변 정류소 조회"
        )

    @task(5)
    def search_route_by_name(self):
        """
        노선 검색
        가중치: 5 (전체 요청의 약 25%)
        """
        keyword = random.choice(self.test_route_names)

        response = self.client.get(
            "/api/routes/search",
            params={"keyword": keyword},
            name="노선 검색"
        )

        # 검색 결과에서 노선 ID 수집
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                self.test_route_ids.append(data[0]["routeId"])

    @task(3)
    def get_station_routes(self):
        """
        정류소의 노선 조회
        가중치: 3 (전체 요청의 약 15%)
        """
        if not self.test_station_ids:
            return

        station_id = random.choice(self.test_station_ids)

        self.client.get(
            f"/api/stations/{station_id}/routes",
            name="정류소 노선 조회"
        )

    @task(2)
    def get_route_detail(self):
        """
        노선 상세 정보 조회
        가중치: 2 (전체 요청의 약 10%)
        """
        if not self.test_route_ids:
            # 테스트용 기본 노선 ID 사용
            route_id = "100100118"  # 421번 노선
        else:
            route_id = random.choice(self.test_route_ids)

        self.client.get(
            f"/api/routes/{route_id}",
            name="노선 상세 조회"
        )

    @task(1)
    def get_station_routes_climate_only(self):
        """
        정류소의 기후동행카드 적용 노선만 조회
        가중치: 1 (전체 요청의 약 5%)
        """
        if not self.test_station_ids:
            return

        station_id = random.choice(self.test_station_ids)

        self.client.get(
            f"/api/routes/station/{station_id}/climate-eligible",
            name="기후동행카드 노선만 조회"
        )


class HealthCheckUser(HttpUser):
    """
    헬스체크 전용 사용자 (모니터링 시뮬레이션)
    """
    wait_time = between(5, 10)

    @task(1)
    def health_check(self):
        """헬스체크 엔드포인트"""
        self.client.get(
            "/actuator/health",
            name="[모니터링] 헬스체크"
        )


class HeavyLoadUser(HttpUser):
    """
    고부하 시나리오 (출퇴근 시간대 시뮬레이션)
    연속적인 요청으로 캐싱 효과 테스트
    """
    wait_time = between(0.1, 0.5)  # 매우 짧은 대기 시간

    @task(1)
    def burst_nearby_search(self):
        """
        같은 위치를 연속으로 조회 (캐싱 효과 테스트)
        """
        # 서울역 고정
        self.client.get(
            "/api/stations/nearby",
            params={
                "lat": 37.5546788,
                "lng": 126.9709683,
                "radius": 500
            },
            name="[고부하] 서울역 반복 조회"
        )
