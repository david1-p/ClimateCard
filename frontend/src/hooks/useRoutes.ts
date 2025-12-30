import { useState, useCallback } from 'react';
import { routeApi } from '../api/route';
import { stationApi } from '../api/station';
import type { Route, Station } from '../types';
import { logger } from '../utils/logger';

/**
 * 노선 관련 상태 및 로직 Hook
 */
export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [climateOnly, setClimateOnly] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeStations, setRouteStations] = useState<Station[]>([]);
  const [routeStationsLoading, setRouteStationsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'arrivalTime' | 'routeOrder'>('arrivalTime');

  // Fetch routes for a station
  const fetchRoutesForStation = useCallback(async (stationId: string) => {
    logger.log(`🔍 Fetching routes for station: ${stationId}`);
    setRoutesLoading(true);
    try {
      const data = await stationApi.getAllRoutes(stationId);
      logger.log(`✅ Found ${data.length} routes`);
      setRoutes(data);
    } catch (err) {
      logger.error("❌ Failed to fetch routes for station:", err);
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  // Search routes by keyword
  const searchRoutes = useCallback(async (keyword: string) => {
    if (!keyword || keyword.trim().length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const data = await routeApi.searchRoutes(keyword);
      logger.log(`✅ Found ${data.length} routes for "${keyword}"`);
      setSearchResults(data);
    } catch (err) {
      logger.error("❌ Failed to search routes:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch stations for a route
  const fetchStationsForRoute = useCallback(async (routeId: string) => {
    logger.log(`🔍 Fetching stations for route: ${routeId}`);
    setRouteStationsLoading(true);
    try {
      const data = await routeApi.getRouteStations(routeId);
      logger.log(`✅ Found ${data.length} stations for route`);
      setRouteStations(data);
    } catch (err) {
      logger.error("❌ Failed to fetch stations for route:", err);
      setRouteStations([]);
    } finally {
      setRouteStationsLoading(false);
    }
  }, []);

  return {
    routes,
    setRoutes,
    routesLoading,
    setRoutesLoading,
    searchKeyword,
    setSearchKeyword,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    climateOnly,
    setClimateOnly,
    selectedRoute,
    setSelectedRoute,
    routeStations,
    setRouteStations,
    routeStationsLoading,
    setRouteStationsLoading,
    sortBy,
    setSortBy,
    fetchRoutesForStation,
    searchRoutes,
    fetchStationsForRoute,
  };
}
