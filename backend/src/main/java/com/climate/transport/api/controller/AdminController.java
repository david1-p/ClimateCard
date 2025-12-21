package com.climate.transport.api.controller;

import com.climate.transport.integration.station.StationSyncService;
import com.climate.transport.integration.route.RouteSyncService;
import com.climate.transport.integration.seoul.SeoulStationSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final StationSyncService stationSyncService;
    private final RouteSyncService routeSyncService;
    private final SeoulStationSyncService seoulStationSyncService;
    private final com.climate.transport.batch.processor.ClimateCardExcelImporter climateCardExcelImporter;
    private final com.climate.transport.domain.route.repository.RouteRepository routeRepository;

    /**
     * 정류소 데이터 동기화
     * 
     * @param searchTerm 검색어 (예: "서울역", "강남", "시청" 등)
     */
    @PostMapping("/sync/stations")
    public ResponseEntity<Map<String, Object>> syncStations(
            @RequestParam(defaultValue = "서울") String searchTerm) {
        log.info("Starting station sync for: {}", searchTerm);
        try {
            stationSyncService.syncStations(searchTerm);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "정류소 동기화 완료: " + searchTerm));
        } catch (Exception e) {
            log.error("Station sync failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    /**
     * 노선 데이터 동기화
     *
     * @param routeName 노선명 (예: "140", "753", "146" 등)
     */
    @PostMapping("/sync/routes")
    public ResponseEntity<Map<String, Object>> syncRoutes(
            @RequestParam String routeName) {
        log.info("Starting route sync for: {}", routeName);
        try {
            routeSyncService.syncRoute(routeName);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "노선 동기화 완료: " + routeName));
        } catch (Exception e) {
            log.error("Route sync failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    /**
     * 서울열린데이터광장 API로 전체 정류소 동기화
     * 약 11,290개의 정류소 데이터를 가져옵니다.
     */
    @PostMapping("/sync/seoul-stations")
    public ResponseEntity<Map<String, Object>> syncSeoulStations() {
        log.info("Starting Seoul station sync");
        try {
            seoulStationSyncService.syncAllStations();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "서울시 정류소 동기화 완료"));
        } catch (Exception e) {
            log.error("Seoul station sync failed", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }

    /**
     * 기후동행카드 적용 노선 재설정
     * 1. 모든 노선을 false로 초기화
     * 2. 엑셀 파일을 읽어서 적용 노선만 true로 업데이트
     */
    @PostMapping("/reset-climate-card")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetClimateCardEligibility() {
        log.info("Resetting climate card eligibility for all routes");
        try {
            // 1. 모든 노선을 false로 초기화
            int totalRoutes = routeRepository.findAll().size();
            routeRepository.findAll().forEach(route -> route.updateClimateCardEligible(false));
            log.info("Reset {} routes to ineligible", totalRoutes);

            // 2. 엑셀 파일로 업데이트
            climateCardExcelImporter.importExcel();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "기후동행카드 적용 여부 재설정 완료",
                    "totalRoutes", totalRoutes));
        } catch (Exception e) {
            log.error("Failed to reset climate card eligibility", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()));
        }
    }
}
