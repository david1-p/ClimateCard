package com.climate.transport.domain.station.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;
import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;

@Entity
@Table(name = "stations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Station {

    @Id
    @Column(name = "station_id", length = 20)
    @Comment("정류소 ID")
    private String stationId;

    @Column(name = "station_name", nullable = false, length = 100)
    @Comment("정류소명")
    private String stationName;

    @Column(name = "location", nullable = false, columnDefinition = "geography(Point, 4326)")
    @Comment("위치 좌표 (PostGIS)")
    private Point location;

    @Column(name = "station_type", length = 20)
    private String stationType;

    @Column(name = "mobile_number", length = 20)
    @Comment("ARS 번호")
    private String mobileNumber;

    @Column(name = "region_name", length = 50)
    private String regionName;

    @Column(name = "district_name", length = 50)
    private String districtName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "display_id", length = 10)
    @Comment("표시용 정류소 ID (5자리)")
    private String displayId;

    public Station(String stationId, String stationName, Point location, String stationType, String mobileNumber) {
        this.stationId = stationId;
        this.stationName = stationName;
        this.location = location;
        this.stationType = stationType;
        this.mobileNumber = mobileNumber;
        this.createdAt = LocalDateTime.now();
    }

    public void setDisplayId(String displayId) {
        this.displayId = displayId;
    }
}
