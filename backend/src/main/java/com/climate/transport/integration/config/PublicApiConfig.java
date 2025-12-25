package com.climate.transport.integration.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.xml.MappingJackson2XmlHttpMessageConverter;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * 공공데이터포털 API 설정
 * - XML 응답을 파싱하기 위한 MessageConverter 설정
 */
@Configuration
public class PublicApiConfig {

    @Value("${public-api.base-url}")
    private String baseUrl;

    @Value("${public-api.service-key}")
    private String serviceKey;

    @Bean
    public RestClient publicRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(10).toMillis());

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .messageConverters(converters -> {
                    // XML MessageConverter 추가 (공공데이터 API는 XML 응답)
                    converters.add(new MappingJackson2XmlHttpMessageConverter());
                })
                .build();
    }
}
