package com.climate.transport.api.controller;

import com.climate.transport.api.validation.InputValidator;
import com.climate.transport.api.validation.ValidationConstants;
import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.arrival.service.BusArrivalService;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.service.StationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 정류소 API 컨트롤러
 * - GPS 기반 주변 정류소 조회
 * - 정류소별 노선 조회
 * - 정류소별 버스 도착 정보 조회
 */
@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
@Slf4j
public class StationController {

    private final StationService stationService;
    private final BusArrivalService busArrivalService;
    private final InputValidator inputValidator;

    /**
     * 주변 정류소 조회
     *
     * @param lat 위도 (33.0 ~ 43.0)
     * @param lng 경도 (124.0 ~ 132.0)
     * @param radius 반경 (50m ~ 2000m, 기본값: 500m)
     */
    @GetMapping(value = "/nearby", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<StationResponse>> getNearbyStations(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "500") double radius) {

        // 입력 검증
        inputValidator.validateLatitude(lat);
        inputValidator.validateLongitude(lng);
        inputValidator.validateRadius(radius);

        log.debug("주변 정류소 조회 요청 - 위도: {}, 경도: {}, 반경: {}m", lat, lng, radius);

        List<StationResponse> stations = stationService.findNearbyStations(lat, lng, radius);
        return ResponseEntity.ok(stations);
    }

    /**
     * 정류소별 노선 조회
     *
     * @param stationId 정류소 ID
     */
    @GetMapping(value = "/{stationId}/routes", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> getRoutesByStation(
            @PathVariable String stationId) {

        // 입력 검증
        inputValidator.validateStationId(stationId);

        log.debug("정류소 노선 조회 요청 - 정류소 ID: {}", stationId);

        List<RouteResponse> routes = stationService.findRoutesByStationId(stationId);
        return ResponseEntity.ok(routes);
    }

    /**
     * 정류소별 버스 도착 정보 조회
     *
     * @param stationId 정류소 ID
     */
    @GetMapping(value = "/{stationId}/arrival", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<BusArrivalResponse>> getBusArrivalInfo(
            @PathVariable String stationId) {

        // 입력 검증
        inputValidator.validateStationId(stationId);

        log.debug("버스 도착 정보 조회 요청 - 정류소 ID: {}", stationId);

        List<BusArrivalResponse> arrivals = busArrivalService.getArrivalInfo(stationId);
        return ResponseEntity.ok(arrivals);
    }
}
