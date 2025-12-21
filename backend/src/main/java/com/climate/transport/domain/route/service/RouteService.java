package com.climate.transport.domain.route.service;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.domain.route.repository.RouteStationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStationRepository routeStationRepository;

    @Cacheable(value = "climateCardRoutes", key = "#stationId")
    public List<RouteResponse> findClimateCardRoutesByStation(String stationId) {
        return routeStationRepository.findClimateCardRoutesByStationId(stationId).stream()
                .map(RouteResponse::from)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "routeSearch", key = "#keyword")
    public List<RouteResponse> searchRoutes(String keyword) {
        return routeRepository.searchByRouteName(keyword).stream()
                .map(RouteResponse::from)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "routeDetail", key = "#routeId")
    public RouteResponse findRouteById(String routeId) {
        // Try finding by route_id first, then by route_name
        Route route = routeRepository.findById(routeId)
                .or(() -> routeRepository.findByRouteName(routeId))
                .orElseThrow(() -> new IllegalArgumentException("Route not found: " + routeId));
        return RouteResponse.from(route);
    }

    @Cacheable(value = "stationRoutes", key = "#stationId")
    public List<RouteResponse> findAllRoutesByStation(String stationId) {
        return routeStationRepository.findAllRoutesByStationId(stationId).stream()
                .map(RouteResponse::from)
                .collect(Collectors.toList());
    }
}
