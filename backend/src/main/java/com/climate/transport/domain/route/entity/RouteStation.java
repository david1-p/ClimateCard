package com.climate.transport.domain.route.entity;

import com.climate.transport.domain.station.entity.Station;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "route_stations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(RouteStationId.class)
public class RouteStation {

    @Id
    @Column(name = "route_id")
    private String routeId;

    @Id
    @Column(name = "station_id")
    private String stationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", insertable = false, updatable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", insertable = false, updatable = false)
    private Station station;

    @Column(name = "sequence", nullable = false)
    @Comment("정류소 순번")
    private Integer sequence;

    @Column(name = "direction", length = 100)
    private String direction;

    public RouteStation(String routeId, String stationId, Integer sequence, String direction, Route route,
            Station station) {
        this.routeId = routeId;
        this.stationId = stationId;
        this.sequence = sequence;
        this.direction = direction;
        this.route = route;
        this.station = station;
    }
}
