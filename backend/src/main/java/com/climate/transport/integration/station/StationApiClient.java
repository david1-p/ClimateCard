package com.climate.transport.integration.station;

import com.climate.transport.integration.station.dto.StationApiResponse;
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
public class StationApiClient {

    private final RestClient publicRestClient;

    @Value("${public-api.service-key}")
    private String serviceKey;

    public List<StationApiResponse.StationItem> getStationsByName(String stSrch) {
        // 서울시 정류소정보조회 서비스 (getStationByNameList)
        // URL: http://ws.bus.go.kr/api/rest/stationinfo/getStationByNameList

        URI uri = UriComponentsBuilder.fromPath("/stationinfo/getStationByNameList")
                .queryParam("serviceKey", serviceKey)
                .queryParam("stSrch", stSrch)
                .build() // Spring이 자동으로 인코딩하게 함 (Decoding된 키 사용)
                .toUri();

        try {
            StationApiResponse response = publicRestClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(StationApiResponse.class);

            if (response != null && response.getMsgBody() != null) {
                return response.getMsgBody().getItemList();
            }
        } catch (Exception e) {
            log.error("Failed to fetch stations for search term: " + stSrch, e);
        }

        return Collections.emptyList();
    }
}
