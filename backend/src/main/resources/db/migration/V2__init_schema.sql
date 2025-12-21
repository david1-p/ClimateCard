-- PostGIS 확장 확인
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Routes (노선 정보)
CREATE TABLE routes (
    route_id VARCHAR(20) PRIMARY KEY,
    route_name VARCHAR(100) NOT NULL,
    route_type VARCHAR(20) NOT NULL,  -- 'BUS' or 'SUBWAY'
    climate_card_eligible BOOLEAN DEFAULT false,
    region_name VARCHAR(50),
    district_name VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routes_name ON routes (route_name);
CREATE INDEX idx_routes_climate_eligible ON routes (climate_card_eligible);

-- 2. Stations (정류소 정보)
CREATE TABLE stations (
    station_id VARCHAR(20) PRIMARY KEY,
    station_name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    station_type VARCHAR(20) DEFAULT 'BUS',
    mobile_number VARCHAR(20),
    region_name VARCHAR(50),
    district_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stations_name ON stations (station_name);
-- PostGIS 공간 인덱스
CREATE INDEX idx_stations_location ON stations USING GIST(location);

-- 3. Route-Station Mapping (노선-정류소 관계)
CREATE TABLE route_stations (
    route_id VARCHAR(20) NOT NULL,
    station_id VARCHAR(20) NOT NULL,
    sequence INT NOT NULL,
    direction VARCHAR(100), -- 진행 방향 (상행, 하행 등)
    PRIMARY KEY (route_id, station_id),
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE
);

CREATE INDEX idx_route_stations_station ON route_stations (station_id);
