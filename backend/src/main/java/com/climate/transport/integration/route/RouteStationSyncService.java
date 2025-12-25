package com.climate.transport.integration.route;

import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.entity.RouteStation;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.domain.route.repository.RouteStationRepository;
import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import com.climate.transport.integration.route.dto.RouteStationApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 노선-정류소 연결 정보 동기화 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteStationSyncService {

    private final RouteStationApiClient routeStationApiClient;
    private final RouteStationRepository routeStationRepository;
    private final RouteRepository routeRepository;
    private final StationRepository stationRepository;

    /**
     * 특정 노선의 정류소 목록 동기화
     *
     * @param routeId 노선 ID (예: "100100409")
     */
    @Transactional
    public void syncRouteStations(String routeId) {
        log.info("Starting route-station sync for route ID: {}", routeId);

        // 1. 노선 정보 조회
        Route route = routeRepository.findById(routeId).orElse(null);
        if (route == null) {
            log.warn("Route not found: {}", routeId);
            return;
        }

        // 2. API로부터 정류소 목록 가져오기
        List<RouteStationApiResponse.StationItem> stations = routeStationApiClient.getStationsByRoute(routeId);

        if (stations == null || stations.isEmpty()) {
            log.warn("No stations found for route: {}", routeId);
            return;
        }

        int savedCount = 0;
        for (RouteStationApiResponse.StationItem item : stations) {
            try {
                String stationId = item.getStationId();

                // 3. 정류소 정보 조회
                Station station = stationRepository.findById(stationId).orElse(null);
                if (station == null) {
                    log.debug("Station not found, skipping: {}", stationId);
                    continue;
                }

                // 4. RouteStation 엔티티 생성 및 저장
                RouteStation routeStation = new RouteStation(
                        routeId,
                        stationId,
                        item.getSequence(),
                        item.getDirection(),
                        route,
                        station
                );

                routeStationRepository.save(routeStation);
                savedCount++;
            } catch (Exception e) {
                log.error("Error saving route-station: routeId={}, stationId={}", routeId, item.getStationId(), e);
            }
        }

        log.info("Route-station sync completed. Route: {}, Stations saved: {}/{}",
                route.getRouteName(), savedCount, stations.size());
    }
}
