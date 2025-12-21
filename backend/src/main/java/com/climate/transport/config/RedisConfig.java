package com.climate.transport.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // 기본 캐시 설정
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration
                .defaultCacheConfig()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer()))
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues();

        // 캐시별 개별 TTL 설정
        Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();

        // 정류소 정보: 10분
        cacheConfigurations.put("nearbyStations",
                defaultConfig.entryTtl(Duration.ofMinutes(10)));

        // 노선 정보: 1시간
        cacheConfigurations.put("routeInfo",
                defaultConfig.entryTtl(Duration.ofHours(1)));

        // 기후동행카드 적용 여부: 1시간
        cacheConfigurations.put("climateCardStatus",
                defaultConfig.entryTtl(Duration.ofHours(1)));

        // 실시간 도착 정보: 30초
        cacheConfigurations.put("arrivalInfo",
                defaultConfig.entryTtl(Duration.ofSeconds(30)));

        // 버스 위치 정보: 20초
        cacheConfigurations.put("busLocation",
                defaultConfig.entryTtl(Duration.ofSeconds(20)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .build();
    }
}
