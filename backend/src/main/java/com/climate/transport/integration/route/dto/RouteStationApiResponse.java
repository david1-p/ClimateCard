package com.climate.transport.integration.route.dto;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Getter;
import lombok.ToString;

import java.util.List;

/**
 * 노선별 정류소 목록 조회 API 응답
 * API: getStaionByRoute
 */
@Getter
@ToString
@JacksonXmlRootElement(localName = "ServiceResult")
public class RouteStationApiResponse {

    @JacksonXmlProperty(localName = "msgBody")
    private MsgBody msgBody;

    @Getter
    @ToString
    public static class MsgBody {
        @JacksonXmlElementWrapper(useWrapping = false)
        @JacksonXmlProperty(localName = "itemList")
        private List<StationItem> itemList;
    }

    @Getter
    @ToString
    public static class StationItem {
        @JacksonXmlProperty(localName = "station")
        private String stationId;           // 정류소 ID

        @JacksonXmlProperty(localName = "stationNm")
        private String stationName;         // 정류소명

        @JacksonXmlProperty(localName = "seq")
        private Integer sequence;           // 순번

        @JacksonXmlProperty(localName = "direction")
        private String direction;           // 방향

        @JacksonXmlProperty(localName = "gpsX")
        private String gpsX;                // 경도

        @JacksonXmlProperty(localName = "gpsY")
        private String gpsY;                // 위도

        @JacksonXmlProperty(localName = "arsId")
        private String arsId;               // ARS ID
    }
}
