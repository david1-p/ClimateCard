package com.climate.transport.integration.seoul;

import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import com.climate.transport.integration.seoul.dto.BusStopLocationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeoulStationSyncService {

    private final SeoulApiClient seoulApiClient;
    private final StationRepository stationRepository;
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * 서울시 전체 정류소 동기화
     * 페이지네이션으로 1000개씩 조회
     */
    @Transactional
    public void syncAllStations() {
        log.info("Starting Seoul bus stop sync...");

        int totalCount = seoulApiClient.getTotalBusStopCount();
        log.info("Total bus stops to sync: {}", totalCount);

        if (totalCount == 0) {
            log.warn("No bus stops found from Seoul API");
            return;
        }

        int batchSize = 1000;
        int totalSaved = 0;
        int totalFailed = 0;

        for (int start = 1; start <= totalCount; start += batchSize) {
            int end = Math.min(start + batchSize - 1, totalCount);

            log.info("Fetching batch: {}-{} of {}", start, end, totalCount);

            List<BusStopLocationResponse.BusStop> busStops = seoulApiClient.getBusStopLocations(start, end);

            for (BusStopLocationResponse.BusStop busStop : busStops) {
                try {
                    saveStation(busStop);
                    totalSaved++;
                } catch (Exception e) {
                    log.error("Failed to save station: {}", busStop.getStopsNm(), e);
                    totalFailed++;
                }
            }

            log.info("Batch complete. Saved: {}, Failed: {}", totalSaved, totalFailed);

            // API 부하 방지를 위한 짧은 대기
            if (start + batchSize <= totalCount) {
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        log.info("Seoul bus stop sync complete. Total saved: {}, Total failed: {}", totalSaved, totalFailed);
    }

    private void saveStation(BusStopLocationResponse.BusStop busStop) {
        try {
            double lng = Double.parseDouble(busStop.getXcrd());
            double lat = Double.parseDouble(busStop.getYcrd());
            Point location = geometryFactory.createPoint(new Coordinate(lng, lat));

            // NODE_ID를 station_id로 사용
            Station station = new Station(
                    busStop.getNodeId(),
                    busStop.getStopsNm(),
                    location,
                    "BUS",
                    busStop.getStopsNo()
            );

            stationRepository.save(station);
        } catch (NumberFormatException e) {
            log.error("Invalid coordinates for station {}: x={}, y={}",
                    busStop.getStopsNm(), busStop.getXcrd(), busStop.getYcrd());
            throw e;
        }
    }
}
