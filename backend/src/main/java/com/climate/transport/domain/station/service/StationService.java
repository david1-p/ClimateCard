package com.climate.transport.domain.station.service;

import com.climate.transport.domain.route.dto.RouteResponse;
import com.climate.transport.domain.route.service.RouteService;
import com.climate.transport.domain.station.dto.StationResponse;
import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StationService {

    private final StationRepository stationRepository;
    private final RouteService routeService;
    private final GeometryFactory geometryFactory;  // Spring Bean으로 주입

    @Cacheable(value = "nearbyStations", key = "#lat + ':' + #lng + ':' + #radius")
    public List<StationResponse> findNearbyStations(double lat, double lng, double radius) {
        Point userLocation = geometryFactory.createPoint(new Coordinate(lng, lat));
        List<Station> stations = stationRepository.findStationsWithinRadius(userLocation, radius);

        return stations.stream()
                .map(station -> {
                    // GEOGRAPHY 타입 사용 시 degree로 계산되므로 대략적으로 미터로 변환
                    // 1도 ≈ 111km (위도 기준), 정확한 계산은 PostGIS ST_Distance(geography)를 사용해야 함
                    double distanceInDegrees = station.getLocation().distance(userLocation);
                    double distanceInMeters = distanceInDegrees * 111000; // 대략적 변환
                    return StationResponse.from(station, distanceInMeters);
                })
                .collect(Collectors.toList());
    }

    public List<RouteResponse> findRoutesByStationId(String stationId) {
        return routeService.findAllRoutesByStation(stationId);
    }
}
