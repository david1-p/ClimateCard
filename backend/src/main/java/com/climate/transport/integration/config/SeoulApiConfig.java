package com.climate.transport.integration.config;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.xml.MappingJackson2XmlHttpMessageConverter;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class SeoulApiConfig {

    @Value("${seoul-api.base-url}")
    private String baseUrl;

    @Value("${seoul-api.service-key}")
    private String serviceKey;

    // XmlMapper를 Bean으로 등록하지 않음 (전역 XML converter 방지)
    private XmlMapper createXmlMapper() {
        return new XmlMapper();
    }

    @Bean
    public RestClient seoulRestClient() {
        XmlMapper xmlMapper = createXmlMapper();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(10).toMillis());

        MappingJackson2XmlHttpMessageConverter xmlConverter = new MappingJackson2XmlHttpMessageConverter(xmlMapper);

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .messageConverters(converters -> {
                    converters.add(xmlConverter);
                })
                .build();
    }

    public String getServiceKey() {
        return serviceKey;
    }
}
