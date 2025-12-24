package com.climate.transport.integration.station;

import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import com.climate.transport.integration.station.dto.StationApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StationSyncService {

    private final StationApiClient stationApiClient;
    private final StationRepository stationRepository;
    private final GeometryFactory geometryFactory;  // Spring Bean으로 주입

    @Transactional
    public void syncStations(String searchTerm) {
        log.info("Starting station sync for search term: {}", searchTerm);
        List<StationApiResponse.StationItem> items = stationApiClient.getStationsByName(searchTerm);

        int count = 0;
        for (StationApiResponse.StationItem item : items) {
            try {
                double lng = Double.parseDouble(item.getGpsX());
                double lat = Double.parseDouble(item.getGpsY());
                Point location = geometryFactory.createPoint(new Coordinate(lng, lat));

                Station station = new Station(
                        item.getStationId(),
                        item.getStationName(),
                        location,
                        item.getStationType(),
                        item.getArsId());

                stationRepository.save(station);
                count++;
            } catch (Exception e) {
                log.error("Error saving station: " + item.getStationName(), e);
            }
        }
        log.info("Synced {} stations.", count);
    }
}
