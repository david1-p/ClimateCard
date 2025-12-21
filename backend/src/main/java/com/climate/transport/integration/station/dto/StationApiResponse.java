package com.climate.transport.integration.station.dto;

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
public class StationApiResponse {

    @JacksonXmlProperty(localName = "msgHeader")
    private MsgHeader msgHeader;

    @JacksonXmlProperty(localName = "msgBody")
    private MsgBody msgBody;

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MsgHeader {
        @JacksonXmlProperty(localName = "headerCd")
        private String headerCd;
        @JacksonXmlProperty(localName = "headerMsg")
        private String headerMsg;
        @JacksonXmlProperty(localName = "itemCount")
        private int itemCount;
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MsgBody {
        @JacksonXmlElementWrapper(useWrapping = false)
        @JacksonXmlProperty(localName = "itemList")
        private List<StationItem> itemList = new ArrayList<>();
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StationItem {
        @JacksonXmlProperty(localName = "stId")
        private String stationId; // 정류소 고유 ID (예: 100000001)

        @JacksonXmlProperty(localName = "arsId")
        private String arsId; // 정류소 번호 (예: 01001)

        @JacksonXmlProperty(localName = "stNm")
        private String stationName; // 정류소명

        @JacksonXmlProperty(localName = "gpsX")
        private String gpsX; // 경도 (Longitude)

        @JacksonXmlProperty(localName = "gpsY")
        private String gpsY; // 위도 (Latitude)

        @JacksonXmlProperty(localName = "stationTp")
        private String stationType; // 정류소 타입
    }
}
