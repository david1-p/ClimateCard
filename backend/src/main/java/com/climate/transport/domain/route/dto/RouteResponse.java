package com.climate.transport.domain.route.dto;

import com.climate.transport.domain.route.entity.Route;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponse {
    private String routeId;
    private String routeName;
    private String routeType;
    private boolean climateCardEligible;

    public static RouteResponse from(Route route) {
        return RouteResponse.builder()
                .routeId(route.getRouteId())
                .routeName(route.getRouteName())
                .routeType(route.getRouteType())
                .climateCardEligible(route.isClimateCardEligible())
                .build();
    }
}
