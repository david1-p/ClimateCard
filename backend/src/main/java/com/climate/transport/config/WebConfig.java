package com.climate.transport.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 설정
 * - CORS 설정 (개발/운영 환경 분리)
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if ("prod".equals(activeProfile)) {
            // 운영 환경: 특정 도메인만 허용
            registry.addMapping("/api/**")
                    .allowedOrigins("https://기후동행.site")
                    .allowedMethods("GET", "POST", "OPTIONS")
                    .allowedHeaders("Content-Type", "Authorization")
                    .allowCredentials(true)
                    .maxAge(3600);
        } else {
            // 개발 환경: localhost 허용
            registry.addMapping("/**")
                    .allowedOrigins(
                            "http://localhost:5173",  // Vite 기본 포트
                            "http://localhost:5174",  // Vite 대체 포트
                            "http://localhost:3000"   // React 기본 포트
                    )
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("Content-Type", "Authorization", "X-Requested-With")
                    .allowCredentials(true)
                    .maxAge(3600);
        }
    }
}
