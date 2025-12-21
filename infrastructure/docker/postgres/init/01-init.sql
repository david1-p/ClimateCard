-- PostGIS 확장 설치
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 설치 확인
SELECT PostGIS_version();

-- 기본 스키마 확인
\dt
