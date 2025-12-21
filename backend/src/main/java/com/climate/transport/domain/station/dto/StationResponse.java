package com.climate.transport.domain.station.dto;

import com.climate.transport.domain.station.entity.Station;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StationResponse {
    private String stationId;
    private String stationName;
    private double latitude;
    private double longitude;
    private String stationType;
    private String mobileNumber;
    private double distance; // 사용자와의 거리 (미터)

    public static StationResponse from(Station station, double distance) {
        return StationResponse.builder()
                .stationId(station.getStationId())
                .stationName(station.getStationName())
                .latitude(station.getLocation().getY())
                .longitude(station.getLocation().getX())
                .stationType(station.getStationType())
                .mobileNumber(station.getMobileNumber())
                .distance(distance)
                .build();
    }
}
