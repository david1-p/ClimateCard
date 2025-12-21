package com.climate.transport.integration.route.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@JacksonXmlRootElement(localName = "ServiceResult")
@JsonIgnoreProperties(ignoreUnknown = true)
public class RouteApiResponse {

    @JacksonXmlProperty(localName = "msgBody")
    private MsgBody msgBody;

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MsgBody {
        @JacksonXmlElementWrapper(useWrapping = false)
        @JacksonXmlProperty(localName = "itemList")
        private List<RouteItem> itemList = new ArrayList<>();
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RouteItem {
        @JacksonXmlProperty(localName = "busRouteId")
        private String routeId; // 노선 ID (예: 100100118)

        @JacksonXmlProperty(localName = "busRouteNm")
        private String routeName; // 노선명 (예: 150)

        @JacksonXmlProperty(localName = "routeType")
        private String routeType; // 노선 유형 (예: 3 (간선))

        @JacksonXmlProperty(localName = "edStationNm")
        private String endStationName; // 종점

        @JacksonXmlProperty(localName = "stStationNm")
        private String startStationName; // 기점
    }
}
