package com.climate.transport.domain.arrival.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusArrivalResponse {
    private String routeName;           // 노선명
    private String routeId;             // 노선 ID
    private String stationSeq;          // 정류소 순번
    private String arrmsg1;             // 첫번째 도착 메시지
    private String arrmsg2;             // 두번째 도착 메시지
    private Integer traTime1;           // 첫번째 도착 예정 시간(초)
    private Integer traTime2;           // 두번째 도착 예정 시간(초)
    private Integer staOrd;             // 정류소 순서
    private String isLast1;             // 첫번째 버스 막차 여부
    private String isLast2;             // 두번째 버스 막차 여부
    private String busType;             // 버스 타입
    private Boolean climateCardEligible; // 기후동행카드 적용 여부
}
