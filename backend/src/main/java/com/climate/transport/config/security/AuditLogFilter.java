package com.climate.transport.config.security;

import com.climate.transport.domain.audit.entity.AuditLog;
import com.climate.transport.domain.audit.repository.AuditLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * 보안 감사 로그 필터
 * - 모든 API 요청을 DB에 기록
 * - 보안 감사 추적
 * - 이상 행위 탐지
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 3)  // Rate Limit, API Key 다음
public class AuditLogFilter extends OncePerRequestFilter {

    private final AuditLogRepository auditLogRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        long startTime = System.currentTimeMillis();
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        String requestUri = request.getRequestURI();

        // Actuator, 정적 리소스는 로깅 제외
        if (shouldNotLog(requestUri)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 요청 처리
            filterChain.doFilter(request, responseWrapper);
        } finally {
            // 로그 저장 (비동기로 처리하면 더 좋지만, 일단 동기로)
            try {
                saveAuditLog(request, responseWrapper, startTime);
            } catch (Exception e) {
                // 로그 저장 실패해도 요청 처리는 계속
                log.error("감사 로그 저장 실패", e);
            }

            // 응답 복사
            responseWrapper.copyBodyToResponse();
        }
    }

    /**
     * 로깅 제외 대상 판별
     */
    private boolean shouldNotLog(String uri) {
        return uri.startsWith("/actuator") ||
               uri.startsWith("/favicon.ico") ||
               uri.startsWith("/static") ||
               uri.startsWith("/css") ||
               uri.startsWith("/js") ||
               uri.startsWith("/images");
    }

    /**
     * 감사 로그 저장
     */
    private void saveAuditLog(HttpServletRequest request,
                             HttpServletResponse response,
                             long startTime) {

        long endTime = System.currentTimeMillis();
        int responseTimeMs = (int) (endTime - startTime);

        String ipAddress = getClientIp(request);
        String requestUri = request.getRequestURI();
        boolean isAdminApi = requestUri.startsWith("/api/admin");
        boolean apiKeyUsed = request.getHeader("X-Admin-API-Key") != null;

        AuditLog auditLog = AuditLog.builder()
            .timestamp(LocalDateTime.now())
            .ipAddress(ipAddress)
            .userAgent(request.getHeader("User-Agent"))
            .requestMethod(request.getMethod())
            .requestUri(requestUri)
            .queryString(request.getQueryString())
            .statusCode(response.getStatus())
            .responseTimeMs(responseTimeMs)
            .isAdminApi(isAdminApi)
            .apiKeyUsed(apiKeyUsed)
            .build();

        // 에러인 경우 메시지 추가
        if (response.getStatus() >= 400) {
            auditLog = AuditLog.builder()
                .timestamp(auditLog.getTimestamp())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .requestMethod(auditLog.getRequestMethod())
                .requestUri(auditLog.getRequestUri())
                .queryString(auditLog.getQueryString())
                .statusCode(auditLog.getStatusCode())
                .responseTimeMs(auditLog.getResponseTimeMs())
                .isAdminApi(auditLog.getIsAdminApi())
                .apiKeyUsed(auditLog.getApiKeyUsed())
                .errorMessage(getErrorMessage(response.getStatus()))
                .build();
        }

        // DB에 저장
        auditLogRepository.save(auditLog);

        // Admin API 접근은 로그에도 남김
        if (isAdminApi) {
            log.info("Admin API 접근 - IP: {}, URI: {}, Status: {}, Response Time: {}ms",
                ipAddress, requestUri, response.getStatus(), responseTimeMs);
        }
    }

    /**
     * 클라이언트 IP 추출
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }

    /**
     * 상태 코드별 에러 메시지
     */
    private String getErrorMessage(int statusCode) {
        return switch (statusCode) {
            case 400 -> "Bad Request - 잘못된 요청";
            case 401 -> "Unauthorized - 인증 실패";
            case 403 -> "Forbidden - 권한 없음";
            case 404 -> "Not Found - 리소스 없음";
            case 429 -> "Too Many Requests - Rate Limit 초과";
            case 500 -> "Internal Server Error - 서버 오류";
            case 502 -> "Bad Gateway - 게이트웨이 오류";
            case 503 -> "Service Unavailable - 서비스 이용 불가";
            default -> "HTTP " + statusCode;
        };
    }
}
