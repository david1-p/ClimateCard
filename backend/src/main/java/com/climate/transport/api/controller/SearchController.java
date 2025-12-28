package com.climate.transport.api.controller;

import com.climate.transport.api.dto.SearchResultResponse;
import com.climate.transport.api.validation.InputValidator;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.service.StationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 통합 검색 API 컨트롤러
 * - 노선과 정류소를 함께 검색
 */
@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {

    private final RouteService routeService;
    private final StationService stationService;
    private final InputValidator inputValidator;

    /**
     * 통합 검색 (노선 + 정류소)
     *
     * @param keyword 검색 키워드
     * @return 노선과 정류소 검색 결과
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SearchResultResponse> search(
            @RequestParam String keyword) {

        // 입력 검증
        inputValidator.validateKeyword(keyword);

        log.debug("통합 검색 요청 - 키워드: {}", keyword);

        String trimmedKeyword = keyword.trim();

        // 노선 검색
        List<RouteResponse> routes = routeService.searchRoutes(trimmedKeyword);

        // 정류소 검색
        List<StationResponse> stations = stationService.findStationsByName(trimmedKeyword);

        // 통합 결과 반환
        SearchResultResponse result = SearchResultResponse.of(routes, stations);

        log.debug("통합 검색 결과 - 노선: {}개, 정류소: {}개", routes.size(), stations.size());

        return ResponseEntity.ok(result);
    }
}
