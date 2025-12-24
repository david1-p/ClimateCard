package com.climate.transport.config;

import com.climate.transport.config.security.ApiKeyAuthFilter;
import com.climate.transport.config.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.ContentSecurityPolicyHeaderWriter;

/**
 * Spring Security 설정 (다층 보안)
 *
 * 보안 레벨:
 * 1. Rate Limiting - DDoS 방어
 * 2. API Key 인증 - Admin API 보호
 * 3. 보안 헤더 - XSS, Clickjacking, MIME Sniffing 방어
 * 4. CSP - Content Security Policy
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RateLimitFilter rateLimitFilter;
    private final ApiKeyAuthFilter apiKeyAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF: REST API이므로 비활성화
            .csrf(AbstractHttpConfigurer::disable)

            // 세션 사용 안 함 (Stateless)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 인증 설정
            .authorizeHttpRequests(auth -> auth
                // Admin API는 인증 필요
                .requestMatchers("/api/admin/**").authenticated()
                // Public API는 모두 허용
                .requestMatchers("/api/**").permitAll()
                // Actuator는 health, info만 허용
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // 나머지는 거부
                .anyRequest().denyAll()
            )

            // 필터 순서 중요!
            // 1. Rate Limit 필터 (가장 먼저 - 성능상 유리)
            // 2. API Key 인증 필터
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(apiKeyAuthFilter, RateLimitFilter.class)

            // 보안 헤더 설정
            .headers(headers -> headers
                // XSS 보호
                .xssProtection(xss -> xss
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))

                // Clickjacking 방어
                .frameOptions(frame -> frame.deny())

                // MIME 타입 스니핑 방지
                .contentTypeOptions(contentType -> contentType.disable())

                // Referrer 정책 (정보 누출 방지)
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))

                // Content Security Policy (XSS 추가 방어)
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' https://dapi.kakao.com; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: https:; " +
                        "font-src 'self' data:; " +
                        "connect-src 'self' https://dapi.kakao.com;"
                    ))

                // HSTS (HTTPS 강제) - 1년간 HTTPS 사용 강제
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)  // 1년 (365일)
                    .includeSubDomains(true)     // 서브도메인 포함
                    .preload(true)               // HSTS Preload List 등록 가능
                )
            );

        return http.build();
    }
}
