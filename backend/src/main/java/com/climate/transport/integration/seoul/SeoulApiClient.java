package com.climate.transport.integration.seoul;

import com.climate.transport.integration.config.SeoulApiConfig;
import com.climate.transport.integration.seoul.dto.BusStopLocationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class SeoulApiClient {

    private final RestClient seoulRestClient;
    private final SeoulApiConfig seoulApiConfig;

    /**
     * 서울시 버스정류소 위치정보 조회
     *
     * @param start 시작 인덱스 (1부터 시작)
     * @param end 종료 인덱스 (최대 1000개씩 조회 권장)
     * @return 정류소 목록
     */
    public List<BusStopLocationResponse.BusStop> getBusStopLocations(int start, int end) {
        String serviceKey = seoulApiConfig.getServiceKey();

        // URL 패턴: http://openapi.seoul.go.kr:8088/{KEY}/xml/busStopLocationXyInfo/{START}/{END}/%20/
        String path = String.format("/%s/xml/busStopLocationXyInfo/%d/%d/%%20/",
                serviceKey, start, end);

        try {
            log.info("Fetching bus stops from Seoul API: start={}, end={}", start, end);

            BusStopLocationResponse response = seoulRestClient.get()
                    .uri(path)
                    .retrieve()
                    .body(BusStopLocationResponse.class);

            if (response != null && response.getResult() != null) {
                String code = response.getResult().getCode();
                String message = response.getResult().getMessage();

                log.info("Seoul API Response: code={}, message={}", code, message);

                if ("INFO-000".equals(code) && response.getRows() != null) {
                    log.info("Successfully fetched {} bus stops", response.getRows().size());
                    return response.getRows();
                } else {
                    log.warn("Seoul API returned non-success code: {}", code);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch bus stops from Seoul API: start={}, end={}", start, end, e);
        }

        return Collections.emptyList();
    }

    /**
     * 전체 정류소 개수 조회
     */
    public int getTotalBusStopCount() {
        try {
            String serviceKey = seoulApiConfig.getServiceKey();
            String path = String.format("/%s/xml/busStopLocationXyInfo/1/1/%%20/", serviceKey);

            BusStopLocationResponse response = seoulRestClient.get()
                    .uri(path)
                    .retrieve()
                    .body(BusStopLocationResponse.class);

            if (response != null && response.getListTotalCount() != null) {
                return response.getListTotalCount();
            }
        } catch (Exception e) {
            log.error("Failed to get total bus stop count", e);
        }

        return 0;
    }
}
