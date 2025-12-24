package com.climate.transport.config;

import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Geometry 설정
 * - GeometryFactory를 Spring Bean으로 등록
 * - 싱글톤으로 관리하여 중복 생성 방지
 * - WGS84 좌표계 (SRID 4326) 사용
 */
@Configuration
public class GeometryConfig {

    /**
     * WGS84 좌표계 기반 GeometryFactory
     * - SRID: 4326 (WGS84 좌표계)
     * - PrecisionModel: 부동 소수점 좌표 사용
     */
    @Bean
    public GeometryFactory geometryFactory() {
        return new GeometryFactory(new PrecisionModel(), 4326);
    }
}
