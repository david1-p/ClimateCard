INSERT INTO stations (station_id, station_name, location, station_type, mobile_number, district_name, created_at) VALUES 
('100000001', '서울역버스환승센터', ST_SetSRID(ST_MakePoint(126.9729, 37.5557), 4326), 'BUS', '02005', '중구', NOW()) ON CONFLICT (station_id) DO NOTHING;
INSERT INTO stations (station_id, station_name, location, station_type, mobile_number, district_name, created_at) VALUES 
('100000002', '시청앞', ST_SetSRID(ST_MakePoint(126.9772, 37.5678), 4326), 'BUS', '02100', '중구', NOW()) ON CONFLICT (station_id) DO NOTHING;
INSERT INTO stations (station_id, station_name, location, station_type, mobile_number, district_name, created_at) VALUES 
('122000001', '강남역', ST_SetSRID(ST_MakePoint(127.0276, 37.4979), 4326), 'BUS', '23000', '강남구', NOW()) ON CONFLICT (station_id) DO NOTHING;
INSERT INTO stations (station_id, station_name, location, station_type, mobile_number, district_name, created_at) VALUES 
('122000002', '강남역.12번출구', ST_SetSRID(ST_MakePoint(127.0285, 37.4998), 4326), 'BUS', '23100', '강남구', NOW()) ON CONFLICT (station_id) DO NOTHING;

INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, district_name, updated_at) VALUES
('100100063', '140', 'TRUNK', true, '서울', NOW()) ON CONFLICT (route_id) DO NOTHING;
INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, district_name, updated_at) VALUES
('100100077', '402', 'TRUNK', true, '서울', NOW()) ON CONFLICT (route_id) DO NOTHING;
INSERT INTO routes (route_id, route_name, route_type, climate_card_eligible, district_name, updated_at) VALUES
('100100573', '6001', 'AIRPORT', false, '공항', NOW()) ON CONFLICT (route_id) DO NOTHING;

INSERT INTO route_stations (route_id, station_id, sequence, direction) VALUES
('100100063', '100000001', 1, '도봉산'),
('100100063', '122000001', 10, '강남'),
('100100077', '100000001', 1, '서울역'),
('100100077', '100000002', 2, '시청');
