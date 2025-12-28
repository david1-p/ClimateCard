package com.climate.transport.api.dto;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.station.dto.StationResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 통합 검색 결과 응답 DTO
 * 노선과 정류소 검색 결과를 함께 반환
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultResponse {

    /**
     * 검색된 노선 목록
     */
    private List<RouteResponse> routes;

    /**
     * 검색된 정류소 목록
     */
    private List<StationResponse> stations;

    /**
     * 전체 검색 결과 개수
     */
    private int totalCount;

    public static SearchResultResponse of(List<RouteResponse> routes, List<StationResponse> stations) {
        return SearchResultResponse.builder()
                .routes(routes)
                .stations(stations)
                .totalCount(routes.size() + stations.size())
                .build();
    }
}
