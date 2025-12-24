package com.climate.transport.api.controller;

import com.climate.transport.api.dto.AdminApiResponse;
import com.climate.transport.domain.admin.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 관리자 API 컨트롤러
 * - 데이터 동기화
 * - 기후동행카드 적용 노선 관리
 * - API Key 인증 필요 (ApiKeyAuthFilter)
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    /**
     * 정류소 데이터 동기화
     *
     * @param searchTerm 검색어 (예: "서울역", "강남", "시청" 등)
     */
    @PostMapping("/sync/stations")
    public ResponseEntity<AdminApiResponse> syncStations(
            @RequestParam(defaultValue = "서울") String searchTerm) {
        try {
            adminService.syncStations(searchTerm);
            return ResponseEntity.ok(
                    AdminApiResponse.success("정류소 동기화 완료: " + searchTerm)
            );
        } catch (Exception e) {
            log.error("Station sync failed", e);
            return ResponseEntity.internalServerError().body(
                    AdminApiResponse.failure(e.getMessage())
            );
        }
    }

    /**
     * 노선 데이터 동기화
     *
     * @param routeName 노선명 (예: "140", "753", "146" 등)
     */
    @PostMapping("/sync/routes")
    public ResponseEntity<AdminApiResponse> syncRoutes(
            @RequestParam String routeName) {
        try {
            adminService.syncRoutes(routeName);
            return ResponseEntity.ok(
                    AdminApiResponse.success("노선 동기화 완료: " + routeName)
            );
        } catch (Exception e) {
            log.error("Route sync failed", e);
            return ResponseEntity.internalServerError().body(
                    AdminApiResponse.failure(e.getMessage())
            );
        }
    }

    /**
     * 서울열린데이터광장 API로 전체 정류소 동기화
     * 약 11,290개의 정류소 데이터를 가져옵니다.
     */
    @PostMapping("/sync/seoul-stations")
    public ResponseEntity<AdminApiResponse> syncSeoulStations() {
        try {
            adminService.syncSeoulStations();
            return ResponseEntity.ok(
                    AdminApiResponse.success("서울시 정류소 동기화 완료")
            );
        } catch (Exception e) {
            log.error("Seoul station sync failed", e);
            return ResponseEntity.internalServerError().body(
                    AdminApiResponse.failure(e.getMessage())
            );
        }
    }

    /**
     * 기후동행카드 적용 노선 재설정
     * 1. 모든 노선을 false로 초기화
     * 2. 엑셀 파일을 읽어서 적용 노선만 true로 업데이트
     *
     * 경고: 이 API는 관리자 전용입니다. API Key 인증이 필요합니다.
     */
    @PostMapping("/reset-climate-card")
    public ResponseEntity<AdminApiResponse> resetClimateCardEligibility() {
        try {
            long totalRoutes = adminService.resetClimateCardEligibility();
            return ResponseEntity.ok(
                    AdminApiResponse.success(
                            "기후동행카드 적용 여부 재설정 완료",
                            Map.of("totalRoutes", totalRoutes)
                    )
            );
        } catch (IllegalStateException e) {
            // 비즈니스 로직 예외
            log.error("기후동행카드 재설정 실패 - 비즈니스 로직 오류: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                    AdminApiResponse.failure("재설정 실패: " + e.getMessage())
            );
        } catch (Exception e) {
            // 예상치 못한 예외
            log.error("기후동행카드 재설정 실패 - 시스템 오류", e);
            return ResponseEntity.internalServerError().body(
                    AdminApiResponse.failure("시스템 오류가 발생했습니다. 관리자에게 문의하세요.")
            );
        }
    }
}
