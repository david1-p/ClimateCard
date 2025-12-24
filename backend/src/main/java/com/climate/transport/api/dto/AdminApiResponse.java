package com.climate.transport.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Admin API 공통 응답 DTO
 * - 성공/실패 여부
 * - 메시지
 * - 추가 데이터
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminApiResponse {

    /**
     * 성공 여부
     */
    private Boolean success;

    /**
     * 응답 메시지
     */
    private String message;

    /**
     * 추가 데이터 (optional)
     */
    @Builder.Default
    private Map<String, Object> data = new HashMap<>();

    /**
     * 타임스탬프
     */
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * 성공 응답 생성
     */
    public static AdminApiResponse success(String message) {
        return AdminApiResponse.builder()
                .success(true)
                .message(message)
                .build();
    }

    /**
     * 성공 응답 생성 (데이터 포함)
     */
    public static AdminApiResponse success(String message, Map<String, Object> data) {
        return AdminApiResponse.builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    /**
     * 실패 응답 생성
     */
    public static AdminApiResponse failure(String error) {
        return AdminApiResponse.builder()
                .success(false)
                .message(error)
                .build();
    }
}
