package com.climate.transport.domain.station.service;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * StationService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StationService 테스트")
class StationServiceTest {

    @Mock
    private StationRepository stationRepository;

    @Mock
    private RouteService routeService;

    @Spy
    private GeometryFactory geometryFactory = new GeometryFactory();

    @InjectMocks
    private StationService stationService;

    private Station 시청역_정류소;
    private Station 서울역_정류소;

    @BeforeEach
    void setUp() {
        // 시청역 근처 정류소 (위도: 37.5665, 경도: 126.9780)
        Point 시청역_위치 = geometryFactory.createPoint(new Coordinate(126.9780, 37.5665));
        시청역_정류소 = new Station("101000290", "시청앞.덕수궁", 시청역_위치, "BUS", "02286");

        // 서울역 근처 정류소 (위도: 37.5547, 경도: 126.9707)
        Point 서울역_위치 = geometryFactory.createPoint(new Coordinate(126.9707, 37.5547));
        서울역_정류소 = new Station("101000001", "서울역버스환승센터", 서울역_위치, "BUS", "02001");
    }

    @Nested
    @DisplayName("주변 정류소 조회")
    class FindNearbyStations {

        @Test
        @DisplayName("반경 500m 내 정류소 조회 성공")
        void 반경_500m_내_정류소_조회_성공() {
            // given
            double lat = 37.5665;
            double lng = 126.9780;
            double radius = 500.0;

            List<Station> stations = Arrays.asList(시청역_정류소, 서울역_정류소);
            given(stationRepository.findStationsWithinRadius(any(Point.class), anyDouble()))
                    .willReturn(stations);

            // when
            List<StationResponse> results = stationService.findNearbyStations(lat, lng, radius);

            // then
            assertThat(results).hasSize(2);
            assertThat(results.get(0).getStationName()).isEqualTo("시청앞.덕수궁");
            assertThat(results.get(0).getDistance()).isNotNull();
            verify(stationRepository).findStationsWithinRadius(any(Point.class), anyDouble());
        }

        @Test
        @DisplayName("주변에 정류소가 없으면 빈 리스트 반환")
        void 주변에_정류소_없으면_빈_리스트_반환() {
            // given
            double lat = 37.0;
            double lng = 127.0;
            double radius = 100.0;

            given(stationRepository.findStationsWithinRadius(any(Point.class), anyDouble()))
                    .willReturn(List.of());

            // when
            List<StationResponse> results = stationService.findNearbyStations(lat, lng, radius);

            // then
            assertThat(results).isEmpty();
        }

        @Test
        @DisplayName("거리 계산이 포함되어야 함")
        void 거리_계산_포함() {
            // given
            double lat = 37.5665;
            double lng = 126.9780;
            double radius = 1000.0;

            given(stationRepository.findStationsWithinRadius(any(Point.class), anyDouble()))
                    .willReturn(List.of(시청역_정류소));

            // when
            List<StationResponse> results = stationService.findNearbyStations(lat, lng, radius);

            // then
            assertThat(results).hasSize(1);
            assertThat(results.get(0).getDistance()).isNotNull();
            assertThat(results.get(0).getDistance()).isGreaterThanOrEqualTo(0);
        }
    }

    @Nested
    @DisplayName("정류소별 노선 조회")
    class FindRoutesByStation {

        @Test
        @DisplayName("정류소의 모든 노선 조회는 RouteService에 위임")
        void 정류소의_모든_노선_조회는_RouteService_위임() {
            // given
            String stationId = "101000290";
            List<RouteResponse> mockRoutes = List.of(
                    RouteResponse.builder()
                            .routeId("100100409")
                            .routeName("421")
                            .routeType("3")
                            .climateCardEligible(true)
                            .build()
            );
            given(routeService.findAllRoutesByStation(stationId))
                    .willReturn(mockRoutes);

            // when
            List<RouteResponse> results = stationService.findRoutesByStationId(stationId);

            // then
            assertThat(results).hasSize(1);
            assertThat(results.get(0).getRouteName()).isEqualTo("421");
            verify(routeService).findAllRoutesByStation(stationId);
        }
    }
}
