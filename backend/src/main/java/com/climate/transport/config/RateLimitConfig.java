package com.climate.transport.config;

import com.google.common.util.concurrent.RateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting 설정
 * - 사용자별/IP별 요청 제한
 * - DDoS 공격 방어
 * - API별 차등 제한
 */
@Configuration
public class RateLimitConfig {

    /**
     * API별 Rate Limiter 맵
     *
     * 제한 정책:
     * - public: 일반 API, 초당 10회
     * - search: 검색 API, 초당 5회 (무거운 쿼리)
     * - nearby: 주변 정류소 조회, 초당 3회 (PostGIS 쿼리)
     * - admin: 관리자 API, 분당 10회
     */
    @Bean
    public Map<String, RateLimiter> apiRateLimiters() {
        Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();

        // 일반 API: 초당 10회
        limiters.put("public", RateLimiter.create(10.0));

        // 검색 API: 초당 5회 (무거운 쿼리)
        limiters.put("search", RateLimiter.create(5.0));

        // 주변 정류소 조회: 초당 3회 (PostGIS 쿼리)
        limiters.put("nearby", RateLimiter.create(3.0));

        // Admin API: 분당 10회 (0.166회/초)
        limiters.put("admin", RateLimiter.create(10.0 / 60.0));

        return limiters;
    }

    /**
     * IP별 Rate Limiter 맵
     * 동적으로 생성되며, IP당 초당 20회 제한
     */
    @Bean
    public Map<String, RateLimiter> ipRateLimiters() {
        return new ConcurrentHashMap<>();
    }
}
