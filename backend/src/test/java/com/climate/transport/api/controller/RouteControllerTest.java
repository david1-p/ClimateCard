package com.climate.transport.api.controller;

import com.climate.transport.api.validation.InputValidator;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
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
 * RouteController 통합 테스트
 */
@WebMvcTest(
    controllers = RouteController.class,
    excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
    }
)
@DisplayName("RouteController 통합 테스트")
class RouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RouteService routeService;

    @MockBean
    private InputValidator inputValidator;

    @Nested
    @DisplayName("GET /api/routes/search - 노선 검색")
    class SearchRoutes {

        @Test
        @DisplayName("노선 검색 성공")
        void 노선_검색_성공() throws Exception {
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
            given(routeService.searchRoutes("4")).willReturn(routes);

            // when & then
            mockMvc.perform(get("/api/routes/search")
                            .param("keyword", "4")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].routeName").value("421"))
                    .andExpect(jsonPath("$[0].climateCardEligible").value(true))
                    .andExpect(jsonPath("$[1].routeName").value("140"))
                    .andExpect(jsonPath("$[1].climateCardEligible").value(false));

            verify(inputValidator).validateKeyword("4");
            verify(routeService).searchRoutes("4");
        }

        @Test
        @DisplayName("잘못된 키워드로 검색 시 400 Bad Request")
        void 잘못된_키워드_검색_시_400() throws Exception {
            // given
            doThrow(new IllegalArgumentException("검색어를 입력해주세요"))
                    .when(inputValidator).validateKeyword("");

            // when & then
            mockMvc.perform(get("/api/routes/search")
                            .param("keyword", "")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("검색어를 입력해주세요"));
        }
    }

    @Nested
    @DisplayName("GET /api/routes/{routeId} - 노선 상세 조회")
    class GetRouteById {

        @Test
        @DisplayName("노선 ID로 조회 성공")
        void 노선_ID로_조회_성공() throws Exception {
            // given
            RouteResponse route = RouteResponse.builder()
                    .routeId("100100409")
                    .routeName("421")
                    .routeType("3")
                    .climateCardEligible(true)
                    .build();
            given(routeService.findRouteById("100100409")).willReturn(route);

            // when & then
            mockMvc.perform(get("/api/routes/100100409")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.routeId").value("100100409"))
                    .andExpect(jsonPath("$.routeName").value("421"))
                    .andExpect(jsonPath("$.climateCardEligible").value(true));

            verify(inputValidator).validateRouteId("100100409");
            verify(routeService).findRouteById("100100409");
        }

        @Test
        @DisplayName("존재하지 않는 노선 조회 시 400 Bad Request")
        void 존재하지_않는_노선_조회_시_400() throws Exception {
            // given
            given(routeService.findRouteById("999999"))
                    .willThrow(new IllegalArgumentException("Route not found: 999999"));

            // when & then
            mockMvc.perform(get("/api/routes/999999")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Route not found: 999999"));
        }
    }

    @Nested
    @DisplayName("GET /api/routes/station/{stationId}/climate-eligible - 기후동행카드 적용 노선 조회")
    class GetClimateEligibleRoutes {

        @Test
        @DisplayName("정류소의 기후동행카드 적용 노선 조회 성공")
        void 기후동행카드_적용_노선_조회_성공() throws Exception {
            // given
            List<RouteResponse> routes = List.of(
                    RouteResponse.builder()
                            .routeId("100100409")
                            .routeName("421")
                            .routeType("3")
                            .climateCardEligible(true)
                            .build()
            );
            given(routeService.findClimateCardRoutesByStation("101000290"))
                    .willReturn(routes);

            // when & then
            mockMvc.perform(get("/api/routes/station/101000290/climate-eligible")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].routeName").value("421"))
                    .andExpect(jsonPath("$[0].climateCardEligible").value(true));

            verify(inputValidator).validateStationId("101000290");
            verify(routeService).findClimateCardRoutesByStation("101000290");
        }
    }
}
