package com.climate.transport.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Admin API 요청에 대한 API Key 검증 필터
 * - Admin API 엔드포인트에만 적용
 * - X-Admin-API-Key 헤더로 전달된 키 검증
 * - 인증 실패 시 401 Unauthorized 반환
 */
@Component
@Slf4j
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-Admin-API-Key";

    @Value("${admin.api.key}")
    private String adminApiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();

        // Admin API 요청인 경우에만 검증
        if (requestUri.startsWith("/api/admin")) {
            String apiKey = request.getHeader(API_KEY_HEADER);
            String clientIp = getClientIp(request);

            // API Key 누락
            if (apiKey == null || apiKey.isBlank()) {
                log.warn("Admin API 접근 시도 - API Key 없음 - IP: {}, URI: {}", clientIp, requestUri);
                sendUnauthorizedResponse(response, "API Key가 필요합니다. X-Admin-API-Key 헤더를 포함해주세요.");
                return;
            }

            // API Key 불일치
            if (!adminApiKey.equals(apiKey)) {
                log.warn("Admin API 접근 시도 - 잘못된 API Key - IP: {}, URI: {}", clientIp, requestUri);
                sendUnauthorizedResponse(response, "유효하지 않은 API Key입니다.");
                return;
            }

            // 인증 성공 - SecurityContext에 인증 정보 설정
            PreAuthenticatedAuthenticationToken authentication =
                    new PreAuthenticatedAuthenticationToken("admin", null, null);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            log.info("Admin API 인증 성공 - IP: {}, URI: {}", clientIp, requestUri);
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 클라이언트 IP 추출
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip != null ? ip : "unknown";
    }

    /**
     * 401 Unauthorized 응답 전송
     */
    private void sendUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("WWW-Authenticate", "ApiKey");

        String jsonResponse = String.format(
            "{\"timestamp\":\"%s\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"%s\"}",
            LocalDateTime.now(),
            message
        );

        response.getWriter().write(jsonResponse);
        response.getWriter().flush();
    }
}
