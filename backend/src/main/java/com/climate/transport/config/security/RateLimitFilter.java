package com.climate.transport.config.security;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Rate Limiting 필터
 * - IP별 요청 제한 (초당 20회)
 * - API 엔드포인트별 제한 (차등 적용)
 * - 자동화 봇 및 DDoS 공격 차단
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, RateLimiter> apiRateLimiters;
    private final Map<String, RateLimiter> ipRateLimiters;

    private static final double IP_RATE_LIMIT = 20.0;  // IP당 초당 20회

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = getClientIp(request);
        String uri = request.getRequestURI();
        String method = request.getMethod();

        // 1. IP별 Rate Limiting (전체 요청)
        RateLimiter ipLimiter = ipRateLimiters.computeIfAbsent(
            clientIp,
            k -> RateLimiter.create(IP_RATE_LIMIT)
        );

        if (!ipLimiter.tryAcquire()) {
            log.warn("IP Rate Limit 초과 - IP: {}, Method: {}, URI: {}", clientIp, method, uri);
            sendRateLimitResponse(response, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        // 2. API별 Rate Limiting
        RateLimiter apiLimiter = getApiRateLimiter(uri);
        if (apiLimiter != null && !apiLimiter.tryAcquire()) {
            log.warn("API Rate Limit 초과 - IP: {}, Method: {}, URI: {}", clientIp, method, uri);
            sendRateLimitResponse(response, "이 API에 대한 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * URI에 따른 Rate Limiter 선택
     */
    private RateLimiter getApiRateLimiter(String uri) {
        if (uri.startsWith("/api/admin")) {
            return apiRateLimiters.get("admin");
        } else if (uri.contains("/search")) {
            return apiRateLimiters.get("search");
        } else if (uri.contains("/nearby")) {
            return apiRateLimiters.get("nearby");
        } else if (uri.startsWith("/api")) {
            return apiRateLimiters.get("public");
        }
        return null;
    }

    /**
     * 실제 클라이언트 IP 추출 (프록시 및 로드밸런서 고려)
     */
    private String getClientIp(HttpServletRequest request) {
        // X-Forwarded-For: 프록시를 거친 경우 원본 IP
        String ip = request.getHeader("X-Forwarded-For");

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // 여러 IP가 있는 경우 첫 번째 IP 사용 (원본 클라이언트 IP)
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip != null ? ip : "unknown";
    }

    /**
     * Rate Limit 초과 응답 (HTTP 429 Too Many Requests)
     */
    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429);  // Too Many Requests
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", "60");  // 60초 후 재시도 권장
        response.setHeader("X-RateLimit-Limit", String.valueOf((int)IP_RATE_LIMIT));

        String jsonResponse = String.format(
            "{\"timestamp\":\"%s\",\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"%s\"}",
            LocalDateTime.now(),
            message
        );

        response.getWriter().write(jsonResponse);
        response.getWriter().flush();
    }
}
