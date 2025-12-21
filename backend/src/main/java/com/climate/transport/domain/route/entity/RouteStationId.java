package com.climate.transport.domain.route.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RouteStationId implements Serializable {
    private String routeId;
    private String stationId;
}
