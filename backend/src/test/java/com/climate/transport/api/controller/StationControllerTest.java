package com.climate.transport.api.controller;

import com.climate.transport.api.validation.InputValidator;
import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.arrival.service.BusArrivalService;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.service.StationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * StationController 통합 테스트
 */
@WebMvcTest(
    controllers = StationController.class,
    excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    }
)
@DisplayName("StationController 통합 테스트")
class StationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StationService stationService;

    @MockBean
    private BusArrivalService busArrivalService;

    @MockBean
    private InputValidator inputValidator;

    @Nested
    @DisplayName("GET /api/stations/nearby - 주변 정류소 조회")
    class GetNearbyStations {

        @Test
        @DisplayName("주변 정류소 조회 성공")
        void 주변_정류소_조회_성공() throws Exception {
            // given
            List<StationResponse> stations = Arrays.asList(
                    StationResponse.builder()
                            .stationId("101000290")
                            .stationName("시청앞.덕수궁")
                            .latitude(37.5665)
                            .longitude(126.9780)
                            .stationType("BUS")
                            .mobileNumber("02286")
                            .distance(150.0)
                            .build(),
                    StationResponse.builder()
                            .stationId("101000001")
                            .stationName("서울역버스환승센터")
                            .latitude(37.5547)
                            .longitude(126.9707)
                            .stationType("BUS")
                            .mobileNumber("02001")
                            .distance(300.0)
                            .build()
            );
            given(stationService.findNearbyStations(37.5665, 126.9780, 500.0))
                    .willReturn(stations);

            // when & then
            mockMvc.perform(get("/api/stations/nearby")
                            .param("lat", "37.5665")
                            .param("lng", "126.9780")
                            .param("radius", "500")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].stationName").value("시청앞.덕수궁"))
                    .andExpect(jsonPath("$[0].distance").value(150.0))
                    .andExpect(jsonPath("$[1].stationName").value("서울역버스환승센터"))
                    .andExpect(jsonPath("$[1].distance").value(300.0));

            verify(inputValidator).validateLatitude(37.5665);
            verify(inputValidator).validateLongitude(126.9780);
            verify(inputValidator).validateRadius(500.0);
            verify(stationService).findNearbyStations(37.5665, 126.9780, 500.0);
        }

        @Test
        @DisplayName("기본 반경값(500m) 적용")
        void 기본_반경값_적용() throws Exception {
            // given
            given(stationService.findNearbyStations(37.5665, 126.9780, 500.0))
                    .willReturn(List.of());

            // when & then
            mockMvc.perform(get("/api/stations/nearby")
                            .param("lat", "37.5665")
                            .param("lng", "126.9780")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());

            verify(stationService).findNearbyStations(37.5665, 126.9780, 500.0);
        }

        @Test
        @DisplayName("잘못된 위도로 요청 시 400 Bad Request")
        void 잘못된_위도_요청_시_400() throws Exception {
            // given
            doThrow(new IllegalArgumentException("위도는 33.0 ~ 43.0 사이여야 합니다"))
                    .when(inputValidator).validateLatitude(50.0);

            // when & then
            mockMvc.perform(get("/api/stations/nearby")
                            .param("lat", "50.0")
                            .param("lng", "126.9780")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("위도는 33.0 ~ 43.0 사이여야 합니다"));
        }

        @Test
        @DisplayName("잘못된 경도로 요청 시 400 Bad Request")
        void 잘못된_경도_요청_시_400() throws Exception {
            // given
            doThrow(new IllegalArgumentException("경도는 124.0 ~ 132.0 사이여야 합니다"))
                    .when(inputValidator).validateLongitude(150.0);

            // when & then
            mockMvc.perform(get("/api/stations/nearby")
                            .param("lat", "37.5665")
                            .param("lng", "150.0")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("경도는 124.0 ~ 132.0 사이여야 합니다"));
        }
    }

    @Nested
    @DisplayName("GET /api/stations/{stationId}/routes - 정류소별 노선 조회")
    class GetRoutesByStation {

        @Test
        @DisplayName("정류소의 모든 노선 조회 성공")
        void 정류소_노선_조회_성공() throws Exception {
            // given
            List<RouteResponse> routes = Arrays.asList(
                    RouteResponse.builder()
                            .routeId("100100409")
                            .routeName("421")
                            .routeType("3")
                            .climateCardEligible(true)
                            .build(),
                    RouteResponse.builder()
                            .routeId("100100234")
                            .routeName("140")
                            .routeType("3")
                            .climateCardEligible(false)
                            .build()
            );
            given(stationService.findRoutesByStationId("101000290"))
                    .willReturn(routes);

            // when & then
            mockMvc.perform(get("/api/stations/101000290/routes")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].routeName").value("421"))
                    .andExpect(jsonPath("$[0].climateCardEligible").value(true))
                    .andExpect(jsonPath("$[1].routeName").value("140"))
                    .andExpect(jsonPath("$[1].climateCardEligible").value(false));

            verify(inputValidator).validateStationId("101000290");
            verify(stationService).findRoutesByStationId("101000290");
        }
    }

    @Nested
    @DisplayName("GET /api/stations/{stationId}/arrival - 버스 도착 정보 조회")
    class GetBusArrivalInfo {

        @Test
        @DisplayName("버스 도착 정보 조회 성공")
        void 버스_도착_정보_조회_성공() throws Exception {
            // given
            List<BusArrivalResponse> arrivals = List.of(
                    BusArrivalResponse.builder()
                            .routeId("100100409")
                            .routeName("421")
                            .arrmsg1("3분후[5번째 전]")
                            .arrmsg2("10분후[12번째 전]")
                            .build()
            );
            given(busArrivalService.getArrivalInfo("101000290"))
                    .willReturn(arrivals);

            // when & then
            mockMvc.perform(get("/api/stations/101000290/arrival")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].routeName").value("421"))
                    .andExpect(jsonPath("$[0].arrmsg1").value("3분후[5번째 전]"));

            verify(inputValidator).validateStationId("101000290");
            verify(busArrivalService).getArrivalInfo("101000290");
        }
    }
}
