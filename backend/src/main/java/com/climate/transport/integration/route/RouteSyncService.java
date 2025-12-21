package com.climate.transport.integration.route;

import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.integration.route.dto.RouteApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteSyncService {

    private final RouteApiClient routeApiClient;
    private final RouteRepository routeRepository;

    @Transactional
    public void syncRoute(String routeName) {
        log.info("Starting route sync for name: {}", routeName);
        List<RouteApiResponse.RouteItem> items = routeApiClient.getRouteInfo(routeName);

        for (RouteApiResponse.RouteItem item : items) {
            try {
                // 노선 유형 매핑 (간단히 처리, 실제로는 코드표 참조 필요)
                String type = mapRouteType(item.getRouteType());

                // 기후동행카드 적용 여부는 별도 로직이나 리스트가 필요함 (일단 false로 초기화)
                // 추후 public data 포털의 다른 API나 정적 데이터와 결합 필요
                boolean isEligible = checkClimateCardEligibility(item.getRouteName());

                Route route = new Route(
                        item.getRouteId(),
                        item.getRouteName(),
                        type,
                        isEligible);

                routeRepository.save(route);
            } catch (Exception e) {
                log.error("Error saving route: " + item.getRouteName(), e);
            }
        }
    }

    private String mapRouteType(String typeCode) {
        // 서울시 공공데이터 노선 유형 코드 매핑 (예시)
        return switch (typeCode) {
            case "1" -> "AIRPORT";
            case "2" -> "VILLAGE";
            case "3" -> "TRUNK"; // 간선
            case "4" -> "BRANCH"; // 지선
            case "5" -> "CIRCULATION"; // 순환
            case "6" -> "WIDE"; // 광역
            default -> "BUS";
        };
    }

    private boolean checkClimateCardEligibility(String routeName) {
        // TODO: 기후동행카드 적용 노선 목록(Excel 등)과 대조 로직 필요
        // 임시로 간선/지선/마을버스만 true로 가정
        return true;
    }
}
