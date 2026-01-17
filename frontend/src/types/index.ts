export interface Station {
    stationId: string;
    displayId: string | null;  // 표시용 ID (5자리)
    stationName: string;
    latitude: number;
    longitude: number;
    stationType: string;
    mobileNumber: string;
    distance: number;
}

export interface Route {
    routeId: string;
    routeName: string;
    routeType: string;
    climateCardEligible: boolean;
}

export interface BusArrival {
    routeName: string;
    routeId: string;
    stationSeq: string;
    arrmsg1: string;
    arrmsg2: string;
    traTime1: number | null;
    traTime2: number | null;
    staOrd: number | null;
    isLast1: string;
    isLast2: string;
    busType: string;
    climateCardEligible: boolean;
}
