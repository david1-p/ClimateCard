package com.climate.transport.integration.seoul.dto;

import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlProperty;
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement;
import lombok.Data;

import java.util.List;

@Data
@JacksonXmlRootElement(localName = "busStopLocationXyInfo")
public class BusStopLocationResponse {

    @JacksonXmlProperty(localName = "list_total_count")
    private Integer listTotalCount;

    @JacksonXmlProperty(localName = "RESULT")
    private Result result;

    @JacksonXmlElementWrapper(useWrapping = false)
    @JacksonXmlProperty(localName = "row")
    private List<BusStop> rows;

    @Data
    public static class Result {
        @JacksonXmlProperty(localName = "CODE")
        private String code;

        @JacksonXmlProperty(localName = "MESSAGE")
        private String message;
    }

    @Data
    public static class BusStop {
        @JacksonXmlProperty(localName = "STOPS_NO")
        private String stopsNo;

        @JacksonXmlProperty(localName = "STOPS_NM")
        private String stopsNm;

        @JacksonXmlProperty(localName = "XCRD")
        private String xcrd;

        @JacksonXmlProperty(localName = "YCRD")
        private String ycrd;

        @JacksonXmlProperty(localName = "NODE_ID")
        private String nodeId;

        @JacksonXmlProperty(localName = "STOPS_TYPE")
        private String stopsType;
    }
}
