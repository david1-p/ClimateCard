package com.climate.transport.domain.audit.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 보안 감사 로그 엔티티
 * - 모든 API 요청 기록
 * - 보안 감사 추적
 * - 이상 행위 탐지
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_logs_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_logs_ip_address", columnList = "ip_address"),
    @Index(name = "idx_audit_logs_status_code", columnList = "status_code"),
    @Index(name = "idx_audit_logs_is_admin_api", columnList = "is_admin_api")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 요청 시각
     */
    @Column(nullable = false)
    private LocalDateTime timestamp;

    /**
     * 클라이언트 IP 주소
     */
    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    /**
     * User-Agent (브라우저/봇 정보)
     */
    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    /**
     * HTTP 메서드 (GET, POST, etc.)
     */
    @Column(name = "request_method", length = 10)
    private String requestMethod;

    /**
     * 요청 URI
     */
    @Column(name = "request_uri", length = 500)
    private String requestUri;

    /**
     * 쿼리 스트링
     */
    @Column(name = "query_string", columnDefinition = "TEXT")
    private String queryString;

    /**
     * HTTP 상태 코드
     */
    @Column(name = "status_code")
    private Integer statusCode;

    /**
     * 응답 시간 (밀리초)
     */
    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    /**
     * 에러 메시지 (있는 경우)
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Admin API 요청 여부
     */
    @Column(name = "is_admin_api")
    private Boolean isAdminApi;

    /**
     * API Key 인증 사용 여부
     */
    @Column(name = "api_key_used")
    private Boolean apiKeyUsed;

    /**
     * 생성 시각
     */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isAdminApi == null) {
            isAdminApi = false;
        }
        if (apiKeyUsed == null) {
            apiKeyUsed = false;
        }
    }
}
