package com.climate.transport.domain.route.repository;

import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.entity.RouteStation;
import com.climate.transport.domain.route.entity.RouteStationId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RouteStationRepository extends JpaRepository<RouteStation, RouteStationId> {

    @Query("SELECT r FROM RouteStation rs JOIN rs.route r " +
            "WHERE rs.stationId = :stationId " +
            "AND r.climateCardEligible = true " +
            "ORDER BY rs.sequence")
    List<Route> findClimateCardRoutesByStationId(@Param("stationId") String stationId);

    @Query("SELECT r FROM RouteStation rs JOIN rs.route r " +
            "WHERE rs.stationId = :stationId " +
            "ORDER BY rs.sequence")
    List<Route> findAllRoutesByStationId(@Param("stationId") String stationId);
}
