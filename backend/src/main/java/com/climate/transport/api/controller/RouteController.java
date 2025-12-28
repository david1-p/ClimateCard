package com.climate.transport.api.controller;

import com.climate.transport.api.validation.InputValidator;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
import com.climate.transport.domain.station.dto.StationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 노선 API 컨트롤러
 * - 노선 검색
 * - 노선 상세 조회
 * - 정류소별 기후동행카드 적용 노선 조회
 */
@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
@Slf4j
public class RouteController {

    private final RouteService routeService;
    private final InputValidator inputValidator;

    /**
     * 노선 검색
     *
     * @param keyword 검색 키워드 (노선명, 노선번호)
     */
    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> searchRoutes(
            @RequestParam String keyword) {

        // 입력 검증
        inputValidator.validateKeyword(keyword);

        log.debug("노선 검색 요청 - 키워드: {}", keyword);

        List<RouteResponse> routes = routeService.searchRoutes(keyword.trim());
        return ResponseEntity.ok(routes);
    }

    /**
     * 노선 상세 조회
     *
     * @param routeId 노선 ID 또는 노선번호
     */
    @GetMapping(value = "/{routeId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RouteResponse> getRouteById(
            @PathVariable String routeId) {

        // 입력 검증
        inputValidator.validateRouteId(routeId);

        log.debug("노선 상세 조회 요청 - 노선 ID: {}", routeId);

        RouteResponse route = routeService.findRouteById(routeId);
        return ResponseEntity.ok(route);
    }

    /**
     * 노선의 정류소 목록 조회
     *
     * @param routeId 노선 ID
     */
    @GetMapping(value = "/{routeId}/stations", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<StationResponse>> getRouteStations(
            @PathVariable String routeId) {

        // 입력 검증
        inputValidator.validateRouteId(routeId);

        log.debug("노선 정류소 목록 조회 요청 - 노선 ID: {}", routeId);

        List<StationResponse> stations = routeService.findStationsByRoute(routeId);
        return ResponseEntity.ok(stations);
    }

    /**
     * 정류소별 기후동행카드 적용 노선 조회
     *
     * @param stationId 정류소 ID
     */
    @GetMapping(value = "/station/{stationId}/climate-eligible", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> getClimateEligibleRoutes(
            @PathVariable String stationId) {

        // 입력 검증
        inputValidator.validateStationId(stationId);

        log.debug("기후동행카드 적용 노선 조회 요청 - 정류소 ID: {}", stationId);

        List<RouteResponse> routes = routeService.findClimateCardRoutesByStation(stationId);
        return ResponseEntity.ok(routes);
    }
}
