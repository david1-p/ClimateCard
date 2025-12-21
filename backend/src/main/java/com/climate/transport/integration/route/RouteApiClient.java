package com.climate.transport.integration.route;

import com.climate.transport.integration.route.dto.RouteApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class RouteApiClient {

    private final RestClient publicRestClient;

    @Value("${public-api.service-key}")
    private String serviceKey;

    public List<RouteApiResponse.RouteItem> getRouteInfo(String busRouteId) {
        // 서울시 노선정보조회 서비스 (getBusRouteList)
        // URL: http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList

        URI uri = UriComponentsBuilder.fromPath("/busRouteInfo/getBusRouteList")
                .queryParam("serviceKey", serviceKey)
                .queryParam("strSrch", busRouteId) // 검색어가 없으면 전체 or ID 검색
                .build()
                .toUri();

        try {
            RouteApiResponse response = publicRestClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(RouteApiResponse.class);

            if (response != null && response.getMsgBody() != null) {
                return response.getMsgBody().getItemList();
            }
        } catch (Exception e) {
            log.error("Failed to fetch route info for ID: " + busRouteId, e);
        }

        return Collections.emptyList();
    }
}
