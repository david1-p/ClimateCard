package com.climate.transport.domain.admin.service;

import com.climate.transport.batch.processor.ClimateCardExcelImporter;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.integration.route.RouteSyncService;
import com.climate.transport.integration.route.RouteStationSyncService;
import com.climate.transport.integration.seoul.SeoulStationSyncService;
import com.climate.transport.integration.station.StationSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 서비스
 * - 데이터 동기화
 * - 기후동행카드 적용 노선 관리
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final StationSyncService stationSyncService;
    private final RouteSyncService routeSyncService;
    private final RouteStationSyncService routeStationSyncService;
    private final SeoulStationSyncService seoulStationSyncService;
    private final ClimateCardExcelImporter climateCardExcelImporter;
    private final RouteRepository routeRepository;

    /**
     * 정류소 동기화
     * @param searchTerm 검색어
     */
    public void syncStations(String searchTerm) {
        log.info("Starting station sync for: {}", searchTerm);
        stationSyncService.syncStations(searchTerm);
        log.info("Station sync completed for: {}", searchTerm);
    }

    /**
     * 노선 동기화
     * @param routeName 노선명
     */
    public void syncRoutes(String routeName) {
        log.info("Starting route sync for: {}", routeName);
        routeSyncService.syncRoute(routeName);
        log.info("Route sync completed for: {}", routeName);
    }

    /**
     * 서울시 전체 정류소 동기화
     */
    public void syncSeoulStations() {
        log.info("Starting Seoul station sync");
        seoulStationSyncService.syncAllStations();
        log.info("Seoul station sync completed");
    }

    /**
     * 노선-정류소 연결 정보 동기화
     * @param routeId 노선 ID
     */
    public void syncRouteStations(String routeId) {
        log.info("Starting route-station sync for: {}", routeId);
        routeStationSyncService.syncRouteStations(routeId);
        log.info("Route-station sync completed for: {}", routeId);
    }

    /**
     * 기후동행카드 적용 노선 재설정
     * 1. 모든 노선을 false로 초기화
     * 2. 엑셀 파일을 읽어서 적용 노선만 true로 업데이트
     *
     * @return 총 노선 수
     */
    @Transactional
    public long resetClimateCardEligibility() {
        log.info("기후동행카드 적용 노선 재설정 시작");

        // 1. 모든 노선을 false로 초기화
        long totalRoutes = routeRepository.count();
        routeRepository.resetAllClimateCardEligibility();
        log.info("총 {} 개 노선을 기후동행카드 미적용으로 초기화", totalRoutes);

        // 2. 엑셀 파일로 업데이트
        climateCardExcelImporter.importExcel();
        log.info("기후동행카드 적용 노선 재설정 완료");

        return totalRoutes;
    }
}
