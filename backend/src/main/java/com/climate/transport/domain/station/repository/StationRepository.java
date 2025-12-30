package com.climate.transport.domain.station.repository;

import com.climate.transport.domain.station.entity.Station;
import org.locationtech.jts.geom.Point;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StationRepository extends JpaRepository<Station, String> {

    @Query(value = "SELECT * FROM stations s " +
            "WHERE ST_DWithin(s.location::geography, ST_SetSRID(:point, 4326)::geography, :radius) " +
            "ORDER BY ST_Distance(s.location::geography, ST_SetSRID(:point, 4326)::geography) " +
            "LIMIT 50", nativeQuery = true)
    List<Station> findStationsWithinRadius(@Param("point") Point point, @Param("radius") double radius);

    @Query(value = "SELECT * FROM stations s " +
            "WHERE s.station_name LIKE CONCAT('%', :keyword, '%') " +
            "ORDER BY s.station_name, s.station_id " +
            "LIMIT 100", nativeQuery = true)
    List<Station> findByStationNameContaining(@Param("keyword") String keyword);
}
