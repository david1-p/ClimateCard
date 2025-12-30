import { useState, useCallback } from 'react';
import { arrivalApi } from '../api/arrival';
import type { BusArrival } from '../types';
import { logger } from '../utils/logger';

/**
 * 버스 도착 정보 Hook
 */
export function useArrivals() {
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  // Fetch arrival info for a station
  const fetchArrivals = useCallback(async (stationId: string) => {
    logger.log(`🔍 Fetching arrivals for station: ${stationId}`);
    setArrivalsLoading(true);
    try {
      const data = await arrivalApi.getArrivalsByStation(stationId);
      logger.log(`✅ Found ${data.length} arrivals`);
      setArrivals(data);
    } catch (err) {
      logger.error("❌ Failed to fetch arrivals:", err);
      setArrivals([]);
    } finally {
      setArrivalsLoading(false);
    }
  }, []);

  return {
    arrivals,
    setArrivals,
    arrivalsLoading,
    setArrivalsLoading,
    fetchArrivals,
  };
}
