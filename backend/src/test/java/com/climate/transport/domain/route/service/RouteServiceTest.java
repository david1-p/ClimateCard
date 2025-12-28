package com.climate.transport.domain.route.service;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.domain.route.repository.RouteStationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * RouteService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RouteService 테스트")
class RouteServiceTest {

    @Mock
    private RouteRepository routeRepository;

    @Mock
    private RouteStationRepository routeStationRepository;

    @InjectMocks
    private RouteService routeService;

    private Route 기후동행카드_적용_노선;
    private Route 일반_노선;

    @BeforeEach
    void setUp() {
        기후동행카드_적용_노선 = new Route("100100409", "421", "3", true);
        일반_노선 = new Route("100100234", "140", "3", false);
    }

    @Nested
    @DisplayName("노선 ID로 조회")
    class FindRouteById {

        @Test
        @DisplayName("노선 ID로 조회 성공")
        void 노선_ID로_조회_성공() {
            // given
            given(routeRepository.findById("100100409"))
                    .willReturn(Optional.of(기후동행카드_적용_노선));

            // when
            RouteResponse result = routeService.findRouteById("100100409");

            // then
            assertThat(result).isNotNull();
            assertThat(result.getRouteId()).isEqualTo("100100409");
            assertThat(result.getRouteName()).isEqualTo("421");
            assertThat(result.isClimateCardEligible()).isTrue();
            verify(routeRepository).findById("100100409");
        }

        @Test
        @DisplayName("노선번호(이름)로도 조회 가능 (Fallback)")
        void 노선번호로_조회_성공() {
            // given
            given(routeRepository.findById("421"))
                    .willReturn(Optional.empty());
            given(routeRepository.findByRouteName("421"))
                    .willReturn(Optional.of(기후동행카드_적용_노선));

            // when
            RouteResponse result = routeService.findRouteById("421");

            // then
            assertThat(result).isNotNull();
            assertThat(result.getRouteName()).isEqualTo("421");
            verify(routeRepository).findById("421");
            verify(routeRepository).findByRouteName("421");
        }

        @Test
        @DisplayName("존재하지 않는 노선 조회 시 예외 발생")
        void 존재하지_않는_노선_조회_시_예외_발생() {
            // given
            given(routeRepository.findById(anyString()))
                    .willReturn(Optional.empty());
            given(routeRepository.findByRouteName(anyString()))
                    .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> routeService.findRouteById("999999"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Route not found");
        }
    }

    @Nested
    @DisplayName("노선 검색")
    class SearchRoutes {

        @Test
        @DisplayName("키워드로 노선 검색 성공")
        void 키워드로_노선_검색_성공() {
            // given
            List<Route> routes = Arrays.asList(기후동행카드_적용_노선, 일반_노선);
            given(routeRepository.searchByRouteName("4"))
                    .willReturn(routes);

            // when
            List<RouteResponse> results = routeService.searchRoutes("4");

            // then
            assertThat(results).hasSize(2);
            assertThat(results.get(0).getRouteName()).isEqualTo("421");
            assertThat(results.get(1).getRouteName()).isEqualTo("140");
            verify(routeRepository).searchByRouteName("4");
        }

        @Test
        @DisplayName("검색 결과가 없으면 빈 리스트 반환")
        void 검색_결과_없으면_빈_리스트_반환() {
            // given
            given(routeRepository.searchByRouteName("존재하지않는노선"))
                    .willReturn(List.of());

            // when
            List<RouteResponse> results = routeService.searchRoutes("존재하지않는노선");

            // then
            assertThat(results).isEmpty();
        }
    }

    @Nested
    @DisplayName("정류소별 기후동행카드 적용 노선 조회")
    class FindClimateCardRoutes {

        @Test
        @DisplayName("정류소의 기후동행카드 적용 노선만 조회")
        void 정류소의_기후동행카드_적용_노선만_조회() {
            // given
            String stationId = "101000290";
            List<Route> climateRoutes = List.of(기후동행카드_적용_노선);
            given(routeStationRepository.findClimateCardRoutesByStationId(stationId))
                    .willReturn(climateRoutes);

            // when
            List<RouteResponse> results = routeService.findClimateCardRoutesByStation(stationId);

            // then
            assertThat(results).hasSize(1);
            assertThat(results.get(0).isClimateCardEligible()).isTrue();
            assertThat(results.get(0).getRouteName()).isEqualTo("421");
            verify(routeStationRepository).findClimateCardRoutesByStationId(stationId);
        }

        @Test
        @DisplayName("기후동행카드 적용 노선이 없으면 빈 리스트 반환")
        void 기후동행카드_적용_노선_없으면_빈_리스트_반환() {
            // given
            String stationId = "999999999";
            given(routeStationRepository.findClimateCardRoutesByStationId(stationId))
                    .willReturn(List.of());

            // when
            List<RouteResponse> results = routeService.findClimateCardRoutesByStation(stationId);

            // then
            assertThat(results).isEmpty();
        }
    }

    @Nested
    @DisplayName("정류소별 전체 노선 조회")
    class FindAllRoutes {

        @Test
        @DisplayName("정류소의 모든 노선 조회 (기후카드 적용 여부 무관)")
        void 정류소의_모든_노선_조회() {
            // given
            String stationId = "101000290";
            List<Route> allRoutes = Arrays.asList(기후동행카드_적용_노선, 일반_노선);
            given(routeStationRepository.findAllRoutesByStationId(stationId))
                    .willReturn(allRoutes);

            // when
            List<RouteResponse> results = routeService.findAllRoutesByStation(stationId);

            // then
            assertThat(results).hasSize(2);
            assertThat(results).extracting(RouteResponse::isClimateCardEligible)
                    .containsExactly(true, false);
        }
    }
}
