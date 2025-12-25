package com.climate.transport.integration.route;

import com.climate.transport.integration.route.dto.RouteStationApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

/**
 * 노선별 정류소 목록 조회 API 클라이언트
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RouteStationApiClient {

    private final RestClient publicRestClient;

    @Value("${public-api.service-key}")
    private String serviceKey;

    /**
     * 노선별 정류소 목록 조회
     *
     * @param routeId 노선 ID (예: "100100409")
     * @return 정류소 목록
     */
    public List<RouteStationApiResponse.StationItem> getStationsByRoute(String routeId) {
        // 서울시 노선별 정류소 조회 서비스 (getStaionByRoute)
        // URL: http://ws.bus.go.kr/api/rest/busRouteInfo/getStaionByRoute

        try {
            // RestClient의 uriBuilder를 사용하여 baseUrl과 자동 결합
            RouteStationApiResponse response = publicRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/busRouteInfo/getStaionByRoute")
                            .queryParam("serviceKey", serviceKey)
                            .queryParam("busRouteId", routeId)
                            .build())
                    .retrieve()
                    .body(RouteStationApiResponse.class);

            if (response != null && response.getMsgBody() != null) {
                return response.getMsgBody().getItemList();
            } else {
                log.warn("No station data found for route: {}", routeId);
            }
        } catch (Exception e) {
            log.error("Failed to fetch stations for route ID: " + routeId, e);
        }

        return Collections.emptyList();
    }
}
