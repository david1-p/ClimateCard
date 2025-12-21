package com.climate.transport.api.controller;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping(value = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> searchRoutes(
            @RequestParam String keyword) {
        List<RouteResponse> routes = routeService.searchRoutes(keyword);
        return ResponseEntity.ok(routes);
    }

    @GetMapping(value = "/{routeId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RouteResponse> getRouteById(
            @PathVariable String routeId) {
        RouteResponse route = routeService.findRouteById(routeId);
        return ResponseEntity.ok(route);
    }

    @GetMapping(value = "/station/{stationId}/climate-eligible", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<RouteResponse>> getClimateEligibleRoutes(
            @PathVariable String stationId) {
        List<RouteResponse> routes = routeService.findClimateCardRoutesByStation(stationId);
        return ResponseEntity.ok(routes);
    }
}
