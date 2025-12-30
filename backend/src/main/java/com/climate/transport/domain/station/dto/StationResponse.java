package com.climate.transport.domain.station.dto;

import com.climate.transport.domain.station.entity.Station;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StationResponse {
    private String stationId;
    private String stationName;
    private double latitude;
    private double longitude;
    private String stationType;  // 사용하지 않음 - JSON 응답에서 제외됨
    private String mobileNumber; // 사용하지 않음 - JSON 응답에서 제외됨
    private Double distance; // 사용자와의 거리 (미터) - Double로 변경하여 null 가능

    public static StationResponse from(Station station, double distance) {
        return StationResponse.builder()
                .stationId(station.getStationId())
                .stationName(station.getStationName())
                .latitude(station.getLocation().getY())
                .longitude(station.getLocation().getX())
                // stationType과 mobileNumber는 제외 - null이므로 JSON 응답에 포함되지 않음
                .distance(distance)
                .build();
    }

    public static StationResponse from(Station station) {
        return StationResponse.builder()
                .stationId(station.getStationId())
                .stationName(station.getStationName())
                .latitude(station.getLocation().getY())
                .longitude(station.getLocation().getX())
                // distance는 null - 검색 시 거리 정보 없음
                .build();
    }
}
