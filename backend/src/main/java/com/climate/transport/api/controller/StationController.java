package com.climate.transport.api.controller;

import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.arrival.service.BusArrivalService;
import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.service.StationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
@RequiredArgsConstructor
public class StationController {

    private final StationService stationService;
    private final BusArrivalService busArrivalService;

    @GetMapping(value = "/nearby", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<StationResponse>> getNearbyStations(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "500") double radius) {
        List<StationResponse> stations = stationService.findNearbyStations(lat, lng, radius);
        return ResponseEntity.ok(stations);
    }

    @GetMapping(value = "/{stationId}/routes", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> getRoutesByStation(
            @PathVariable String stationId) {
        List<RouteResponse> routes = stationService.findRoutesByStationId(stationId);
        return ResponseEntity.ok(routes);
    }

    @GetMapping(value = "/{stationId}/arrival", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<BusArrivalResponse>> getBusArrivalInfo(
            @PathVariable String stationId) {
        List<BusArrivalResponse> arrivals = busArrivalService.getArrivalInfo(stationId);
        return ResponseEntity.ok(arrivals);
    }
}
