package com.climate.transport.domain.route.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "routes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Route {

    @Id
    @Column(name = "route_id", length = 20)
    @Comment("노선 ID")
    private String routeId;

    @Column(name = "route_name", nullable = false, length = 100)
    @Comment("노선명 (예: 150, n16)")
    private String routeName;

    @Column(name = "route_type", nullable = false, length = 20)
    @Comment("노선 유형 (BUS, SUBWAY)")
    private String routeType;

    @Column(name = "climate_card_eligible", nullable = false)
    @Comment("기후동행카드 적용 여부")
    private boolean climateCardEligible;

    @Column(name = "region_name", length = 50)
    private String regionName;

    @Column(name = "district_name", length = 50)
    private String districtName;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Route(String routeId, String routeName, String routeType, boolean climateCardEligible) {
        this.routeId = routeId;
        this.routeName = routeName;
        this.routeType = routeType;
        this.climateCardEligible = climateCardEligible;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateClimateCardEligible(boolean eligible) {
        this.climateCardEligible = eligible;
        this.updatedAt = LocalDateTime.now();
    }
}
