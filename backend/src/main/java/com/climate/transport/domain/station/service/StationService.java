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

    /**
     * 위도/경도 1도를 미터로 변환하는 상수
     * 위도 기준 1도 ≈ 111km (대략적 변환)
     * 정확한 계산은 PostGIS ST_Distance(geography) 함수 사용 권장
     */
    private static final double METERS_PER_DEGREE = 111_000.0;

    private final StationRepository stationRepository;
    private final RouteService routeService;
    private final GeometryFactory geometryFactory;

    @Cacheable(value = "nearbyStations", key = "#lat + ':' + #lng + ':' + #radius")
    public List<StationResponse> findNearbyStations(double lat, double lng, double radius) {
        Point userLocation = createPoint(lng, lat);
        List<Station> stations = stationRepository.findStationsWithinRadius(userLocation, radius);

        return stations.stream()
                .map(station -> createStationResponse(station, userLocation))
                .collect(Collectors.toList());
    }

    public List<StationResponse> findStationsByName(String keyword) {
        List<Station> stations = stationRepository.findByStationNameContaining(keyword);

        return stations.stream()
                .map(station -> StationResponse.from(station, 0.0))
                .collect(Collectors.toList());
    }

    public List<RouteResponse> findRoutesByStationId(String stationId) {
        // 같은 위치에 있는 다른 정류소들의 station_id도 함께 조회
        List<String> nearbyStationIds = findNearbyStationIds(stationId);

        // 모든 station_id의 노선을 합쳐서 반환 (중복 제거)
        return nearbyStationIds.stream()
                .flatMap(id -> routeService.findAllRoutesByStation(id).stream())
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * 같은 위치 (10m 이내)에 있는 다른 정류소 ID들을 찾음
     */
    private List<String> findNearbyStationIds(String stationId) {
        return stationRepository.findById(stationId)
                .map(station -> {
                    // 10m 이내의 정류소들 찾기
                    List<Station> nearbyStations = stationRepository.findStationsWithinRadius(
                            station.getLocation(), 10.0);

                    return nearbyStations.stream()
                            .map(Station::getStationId)
                            .collect(Collectors.toList());
                })
                .orElse(List.of(stationId)); // 정류소를 찾지 못하면 원래 ID만 반환
    }

    /**
     * 경도와 위도로 Point 객체 생성
     */
    private Point createPoint(double longitude, double latitude) {
        return geometryFactory.createPoint(new Coordinate(longitude, latitude));
    }

    /**
     * Station 엔티티를 StationResponse DTO로 변환
     * 사용자 위치로부터의 거리를 계산하여 포함
     */
    private StationResponse createStationResponse(Station station, Point userLocation) {
        double distanceInMeters = calculateDistanceInMeters(station.getLocation(), userLocation);
        return StationResponse.from(station, distanceInMeters);
    }

    /**
     * 두 지점 간의 거리를 미터 단위로 계산
     */
    private double calculateDistanceInMeters(Point stationLocation, Point userLocation) {
        double distanceInDegrees = stationLocation.distance(userLocation);
        return distanceInDegrees * METERS_PER_DEGREE;
    }
}
