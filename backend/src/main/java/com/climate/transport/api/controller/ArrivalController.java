package com.climate.transport.api.controller;

import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.arrival.service.BusArrivalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/arrivals")
@RequiredArgsConstructor
public class ArrivalController {

    private final BusArrivalService busArrivalService;

    /**
     * 정류소별 버스 도착 정보 조회
     */
    @GetMapping(value = "/station/{stationId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<BusArrivalResponse>> getArrivalsByStation(
            @PathVariable String stationId) {
        List<BusArrivalResponse> arrivals = busArrivalService.getArrivalInfo(stationId);
        return ResponseEntity.ok(arrivals);
    }
}
