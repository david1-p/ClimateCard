import { useState, useCallback } from 'react';
import { stationApi } from '../api/station';
import type { Station } from '../types';
import { logger } from '../utils/logger';

const DEFAULT_SEARCH_RADIUS = 500; // 주변 정류소 검색 반경 (미터)

/**
 * 정류소 관련 상태 및 로직 Hook
 */
export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationSearchKeyword, setStationSearchKeyword] = useState("");
  const [stationSearchResults, setStationSearchResults] = useState<Station[]>([]);
  const [isStationSearching, setIsStationSearching] = useState(false);

  // Fetch nearby stations
  const fetchNearbyStations = useCallback(async (lat: number, lng: number) => {
    logger.log(`🔍 Fetching stations near: ${lat}, ${lng}`);
    setStationsLoading(true);
    try {
      const data = await stationApi.getNearbyStations(lat, lng, DEFAULT_SEARCH_RADIUS);
      logger.log(`✅ Found ${data.length} stations:`, data);
      setStations(data);
    } catch (err) {
      logger.error("❌ Failed to fetch nearby stations:", err);
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  }, []);

  // Search stations by name
  const searchStations = useCallback(async (keyword: string) => {
    if (!keyword || keyword.trim().length < 1) {
      setStationSearchResults([]);
      return;
    }

    setIsStationSearching(true);
    try {
      const data = await stationApi.searchStations(keyword);
      logger.log(`✅ Found ${data.length} stations for "${keyword}"`);
      setStationSearchResults(data);
    } catch (err) {
      logger.error("❌ Failed to search stations:", err);
      setStationSearchResults([]);
    } finally {
      setIsStationSearching(false);
    }
  }, []);

  return {
    stations,
    setStations,
    selectedStation,
    setSelectedStation,
    stationsLoading,
    stationSearchKeyword,
    setStationSearchKeyword,
    stationSearchResults,
    setStationSearchResults,
    isStationSearching,
    setIsStationSearching,
    fetchNearbyStations,
    searchStations,
  };
}
