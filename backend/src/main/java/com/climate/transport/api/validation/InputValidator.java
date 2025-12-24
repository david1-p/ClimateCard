package com.climate.transport.api.validation;

import org.springframework.stereotype.Component;

/**
 * API 입력 검증 유틸리티
 */
@Component
public class InputValidator {

    /**
     * 위도 유효성 검증
     */
    public void validateLatitude(double lat) {
        if (lat < ValidationConstants.MIN_LATITUDE || lat > ValidationConstants.MAX_LATITUDE) {
            throw new IllegalArgumentException(
                String.format("위도는 %.1f ~ %.1f 사이여야 합니다",
                    ValidationConstants.MIN_LATITUDE,
                    ValidationConstants.MAX_LATITUDE));
        }
    }

    /**
     * 경도 유효성 검증
     */
    public void validateLongitude(double lng) {
        if (lng < ValidationConstants.MIN_LONGITUDE || lng > ValidationConstants.MAX_LONGITUDE) {
            throw new IllegalArgumentException(
                String.format("경도는 %.1f ~ %.1f 사이여야 합니다",
                    ValidationConstants.MIN_LONGITUDE,
                    ValidationConstants.MAX_LONGITUDE));
        }
    }

    /**
     * 반경 유효성 검증
     */
    public void validateRadius(double radius) {
        if (radius < ValidationConstants.MIN_RADIUS || radius > ValidationConstants.MAX_RADIUS) {
            throw new IllegalArgumentException(
                String.format("반경은 %.0fm ~ %.0fm 사이여야 합니다",
                    ValidationConstants.MIN_RADIUS,
                    ValidationConstants.MAX_RADIUS));
        }
    }

    /**
     * 검색 키워드 유효성 검증
     */
    public void validateKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("검색어를 입력해주세요");
        }

        String trimmed = keyword.trim();
        if (trimmed.length() < ValidationConstants.MIN_KEYWORD_LENGTH) {
            throw new IllegalArgumentException(
                String.format("검색어는 최소 %d자 이상이어야 합니다",
                    ValidationConstants.MIN_KEYWORD_LENGTH));
        }

        if (trimmed.length() > ValidationConstants.MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException(
                String.format("검색어는 최대 %d자까지 입력 가능합니다",
                    ValidationConstants.MAX_KEYWORD_LENGTH));
        }

        // XSS 방지: HTML 태그 패턴 검증
        if (trimmed.matches(".*<[^>]+>.*")) {
            throw new IllegalArgumentException("검색어에 HTML 태그를 포함할 수 없습니다");
        }
    }

    /**
     * Station ID 유효성 검증
     */
    public void validateStationId(String stationId) {
        if (stationId == null || stationId.isBlank()) {
            throw new IllegalArgumentException("정류소 ID를 입력해주세요");
        }

        // 정류소 ID는 숫자로만 구성 (서울시 기준)
        if (!stationId.matches("\\d+")) {
            throw new IllegalArgumentException("유효하지 않은 정류소 ID 형식입니다");
        }
    }

    /**
     * Route ID 유효성 검증
     */
    public void validateRouteId(String routeId) {
        if (routeId == null || routeId.isBlank()) {
            throw new IllegalArgumentException("노선 ID를 입력해주세요");
        }

        String trimmed = routeId.trim();
        if (trimmed.length() > ValidationConstants.MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException("유효하지 않은 노선 ID 형식입니다");
        }
    }
}
