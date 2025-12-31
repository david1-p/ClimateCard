import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk"
import { useEffect, useRef } from "react"
import BottomSheet from "./components/Layout/BottomSheet";
import { Card, RouteBadge, ClimateEligibilityBadge } from "./components/ui/Card";
import { StationCardSkeleton, RouteCardSkeleton, SearchResultSkeleton } from "./components/ui/Skeleton";
import { SearchTabs } from "./components/ui/SearchTabs";
import { SearchInput } from "./components/ui/SearchInput";
import { QuickActions } from "./components/ui/QuickActions";
import { EmptyState } from "./components/ui/EmptyState";
import type { Station, Route } from "./types/index";
import { logger } from "./utils/logger";
import { getRouteTypeName } from "./utils/busTypes";
import { formatArrivalMessage, getArrivalTextClass } from "./utils/arrivalFormatter";
import { stationApi } from "./api/station";
import { arrivalApi } from "./api/arrival";
import { routeApi } from "./api/route";
import { useGeolocation } from "./hooks/useGeolocation";
import { useStations } from "./hooks/useStations";
import { useRoutes } from "./hooks/useRoutes";
import { useArrivals } from "./hooks/useArrivals";
import { useSearch } from "./hooks/useSearch";

function App() {
  const appKey = import.meta.env.VITE_KAKAO_APP_KEY;
  const mapRef = useRef<kakao.maps.Map>(null);

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ["services", "clusterer"],
  });

  // Custom Hooks
  const { userLocation, center, setCenter, errorMessage, setErrorMessage, requestUserLocation, isLoadingLocation } = useGeolocation();
  const {
    stations,
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
  } = useStations();
  const {
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
  } = useRoutes();
  const { arrivals, setArrivals, arrivalsLoading, setArrivalsLoading } = useArrivals();
  const { searchTab, setSearchTab } = useSearch();

  // Fetch nearby stations when center changes
  useEffect(() => {
    fetchNearbyStations(center.lat, center.lng);
  }, [center, fetchNearbyStations]);

  // Handle station click
  const handleStationClick = async (station: Station) => {
    logger.log(`🚏 Station clicked:`, station);
    setSelectedStation(station);
    setRoutesLoading(true);
    setArrivalsLoading(true);
    setErrorMessage(null);

    // 정류소를 지도 중앙으로 이동
    const stationPosition = {
      lat: Number(station.latitude),
      lng: Number(station.longitude)
    };
    setCenter(stationPosition);
    if (mapRef.current) {
      mapRef.current.setCenter(new kakao.maps.LatLng(stationPosition.lat, stationPosition.lng));
    }

    try {
      const [routesData, arrivalsData] = await Promise.all([
        stationApi.getAllRoutes(station.stationId),
        arrivalApi.getArrivalsByStation(station.stationId)
      ]);

      logger.log(`🚌 Routes for ${station.stationName}:`, routesData);
      logger.log(`⏰ Arrivals for ${station.stationName}:`, arrivalsData);

      setRoutes(routesData);
      setArrivals(arrivalsData);
    } catch (err) {
      logger.error("❌ Failed to fetch station info:", err);
      setErrorMessage("정류소 정보를 불러오는데 실패했습니다.");
      setRoutes([]);
      setArrivals([]);
    } finally {
      setRoutesLoading(false);
      setArrivalsLoading(false);
    }
  };

  // Refresh station data (without map movement)
  const handleRefreshStation = async () => {
    if (!selectedStation) {
      logger.warn('⚠️ No station selected for refresh');
      return;
    }

    logger.log(`🔄 [REFRESH] Starting refresh for station:`, selectedStation.stationName);
    logger.log(`🔄 [REFRESH] Before - Routes: ${routes.length}, Arrivals: ${arrivals.length}`);

    setRoutesLoading(true);
    setArrivalsLoading(true);
    setErrorMessage(null);

    try {
      const [routesData, arrivalsData] = await Promise.all([
        stationApi.getAllRoutes(selectedStation.stationId),
        arrivalApi.getArrivalsByStation(selectedStation.stationId)
      ]);

      logger.log(`✅ [REFRESH] Successfully fetched - Routes: ${routesData.length}, Arrivals: ${arrivalsData.length}`);
      logger.log(`🚌 [REFRESH] Routes:`, routesData);
      logger.log(`⏰ [REFRESH] Arrivals:`, arrivalsData);

      setRoutes(routesData);
      setArrivals(arrivalsData);

      logger.log(`✅ [REFRESH] State updated successfully`);
    } catch (err) {
      logger.error("❌ [REFRESH] Failed to refresh station info:", err);
      setErrorMessage("정류소 정보를 새로고침하는데 실패했습니다.");
    } finally {
      setRoutesLoading(false);
      setArrivalsLoading(false);
      logger.log(`🔄 [REFRESH] Refresh completed`);
    }
  };

  // Map drag end
  const handleDragEnd = (map: kakao.maps.Map) => {
    const latlng = map.getCenter();
    const newCenter = { lat: latlng.getLat(), lng: latlng.getLng() };
    setCenter(newCenter);
    logger.log('🗺️ Map center moved to:', newCenter);
  };

  // Route search
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const data = await routeApi.searchRoutes(keyword);
      logger.log(`🔍 Search results for "${keyword}":`, data);
      setSearchResults(data);
    } catch (err) {
      logger.error("❌ Failed to search routes:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Station search
  const handleStationSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setStationSearchResults([]);
      setIsStationSearching(false);
      return;
    }

    setIsStationSearching(true);
    try {
      const data = await stationApi.searchStations(keyword);
      logger.log(`🔍 Station search results for "${keyword}":`, data);
      setStationSearchResults(data);
    } catch (err) {
      logger.error("❌ Failed to search stations:", err);
      setStationSearchResults([]);
    } finally {
      setIsStationSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword) {
        handleSearch(searchKeyword);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Station search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (stationSearchKeyword) {
        handleStationSearch(stationSearchKeyword);
      } else {
        setStationSearchResults([]);
        setIsStationSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [stationSearchKeyword]);

  // Display stations: 검색어가 있으면 검색 결과, 없으면 주변 정류소
  const displayedStations = stationSearchKeyword ? stationSearchResults : stations;

  // Filter routes by climate card eligibility
  const filteredSearchResults = climateOnly
    ? searchResults.filter(r => r.climateCardEligible)
    : searchResults;

  const filteredRoutes = climateOnly
    ? routes.filter(r => r.climateCardEligible)
    : routes;

  // 노선 정렬 (도착시간별 또는 노선순서별)
  const sortedFilteredRoutes = [...filteredRoutes].sort((a, b) => {
    const arrivalA = arrivals.find(arr => arr.routeId === a.routeId);
    const arrivalB = arrivals.find(arr => arr.routeId === b.routeId);

    if (sortBy === 'routeOrder') {
      // 노선순서별 정렬 (staOrd 기준)
      const staOrdA = arrivalA?.staOrd ?? 999999;
      const staOrdB = arrivalB?.staOrd ?? 999999;
      return staOrdA - staOrdB;
    } else {
      // 도착시간별 정렬 (기존 로직)
      // 차고지/출발대기 키워드
      const waitingKeywords = ['차고지', '출발대기', '회차', '운행종료', '회차대기'];

      const isWaitingA = arrivalA && (
        waitingKeywords.some(keyword => arrivalA.arrmsg1?.includes(keyword) || arrivalA.arrmsg2?.includes(keyword))
      );
      const isWaitingB = arrivalB && (
        waitingKeywords.some(keyword => arrivalB.arrmsg1?.includes(keyword) || arrivalB.arrmsg2?.includes(keyword))
      );

      // 둘 다 대기 중이면 원래 순서 유지
      if (isWaitingA && isWaitingB) return 0;
      // A만 대기 중이면 A를 아래로
      if (isWaitingA) return 1;
      // B만 대기 중이면 B를 아래로
      if (isWaitingB) return -1;

      // 도착 시간 기준 정렬 (traTime1 사용)
      const timeA = arrivalA?.traTime1 ?? 999999;
      const timeB = arrivalB?.traTime1 ?? 999999;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // 도착 정보가 있는 것을 위로
      if (arrivalA && !arrivalB) return -1;
      if (!arrivalA && arrivalB) return 1;

      return 0;
    }
  });

  // Handle route click (from search results)
  const handleRouteClick = async (route: Route) => {
    logger.log(`🚌 Route clicked:`, route);
    setSelectedRoute(route);
    setSelectedStation(null); // 정류소 선택 해제
    setRouteStationsLoading(true);
    setErrorMessage(null);

    try {
      const stationsData = await routeApi.getRouteStations(route.routeId);
      logger.log(`🚏 Stations for route ${route.routeName}:`, stationsData);
      setRouteStations(stationsData);
    } catch (err) {
      logger.error("❌ Failed to fetch route stations:", err);
      setErrorMessage("노선 정보를 불러오는데 실패했습니다.");
      setRouteStations([]);
    } finally {
      setRouteStationsLoading(false);
    }
  };

  // Handle nearby button click
  const handleNearbyClick = () => {
    if (userLocation) {
      // 이미 위치를 가져온 경우 해당 위치로 이동
      setCenter(userLocation);
      if (mapRef.current) {
        mapRef.current.setCenter(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
      }
    } else {
      // 아직 위치를 가져오지 않은 경우 위치 요청 (사용자 제스처에 의해 호출됨)
      requestUserLocation();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center bg-background gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-primary/30 rounded-full" />
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">지도를 불러오는 중</p>
          <p className="text-xs text-muted-foreground mt-1">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center bg-background p-6 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">지도 로딩 실패</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const handleOpenChat = () => {
    // 카카오톡 오픈챗 URL (환경변수로 설정 가능)
    const openChatUrl = import.meta.env.VITE_KAKAO_OPENCHAT_URL || 'https://open.kakao.com/o/your-openchat-link';
    window.open(openChatUrl, '_blank');
  };

  // SearchPanel 컴포넌트 (데스크탑과 모바일에서 공유)
  const searchPanelContent = (
    <div className="space-y-4 pb-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs text-destructive/70 hover:text-destructive mt-1 font-medium"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* Search Tabs */}
          {!selectedStation && !selectedRoute && (
            <SearchTabs activeTab={searchTab} onTabChange={setSearchTab} />
          )}

          {/* Search Input & Quick Actions */}
          {!selectedStation && !selectedRoute && (
            <div className="space-y-3">
              <SearchInput
                value={searchTab === "route" ? searchKeyword : stationSearchKeyword}
                onChange={searchTab === "route" ? setSearchKeyword : setStationSearchKeyword}
                placeholder={searchTab === "route" ? "버스 노선번호 검색 (예: 421, 7016)" : "정류장 이름 검색"}
              />
              <QuickActions
                onNearbyClick={handleNearbyClick}
                onClimateOnlyClick={() => setClimateOnly(!climateOnly)}
                climateOnly={climateOnly}
                isLoadingLocation={isLoadingLocation}
              />
            </div>
          )}

          {/* Route Search Results */}
          {searchTab === "route" && searchKeyword && !selectedStation && !selectedRoute && (
            <div className="animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  검색 결과
                </h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {filteredSearchResults.length}개
                </span>
              </div>
              <div className="space-y-2">
                {isSearching ? (
                  <>
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </>
                ) : searchResults.length === 0 ? (
                  <EmptyState
                    icon="route"
                    title="검색 결과가 없습니다"
                    description="다른 노선번호로 검색해보세요"
                  />
                ) : filteredSearchResults.length === 0 ? (
                  <EmptyState
                    icon="route"
                    title="기후동행카드 노선이 없습니다"
                    description="필터를 해제하고 다시 검색해보세요"
                  />
                ) : (
                  filteredSearchResults.map(route => (
                    <Card
                      key={route.routeId}
                      interactive
                      highlighted={route.climateCardEligible}
                      onClick={() => handleRouteClick(route)}
                      className="p-3"
                    >
                      <div className="flex items-center gap-3">
                        <RouteBadge routeName={route.routeName} routeType={route.routeType} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">
                            {getRouteTypeName(route.routeType)}
                          </div>
                          <ClimateEligibilityBadge eligible={route.climateCardEligible} />
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Route Search Empty State */}
          {searchTab === "route" && !searchKeyword && !selectedStation && !selectedRoute && (
            <EmptyState
              icon="search"
              title="버스 노선을 검색해보세요"
              description="노선번호를 입력하면 기후동행카드 사용 가능 여부를 확인할 수 있어요"
            />
          )}

          {/* Station Search Results */}
          {searchTab === "station" && !selectedStation && !selectedRoute && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {stationSearchKeyword ? "검색 결과" : "주변 정류장"}
                </h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {displayedStations.length}개
                </span>
              </div>

              {(stationsLoading || isStationSearching) ? (
                <div className="space-y-2">
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                </div>
              ) : displayedStations.length > 0 ? (
                <div className="space-y-2">
                  {displayedStations.map((station) => (
                    <Card
                      key={station.stationId}
                      interactive
                      onClick={() => handleStationClick(station)}
                      className="p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">
                            {station.stationName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{station.stationId}</span>
                            {station.distance && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                <span>{Math.round(station.distance)}m</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="station"
                  title={stationSearchKeyword ? "검색 결과가 없습니다" : "주변 정류장이 없습니다"}
                  description={stationSearchKeyword ? "다른 이름으로 검색해보세요" : "지도를 이동하여 다른 지역을 확인해보세요"}
                />
              )}
            </div>
          )}

          {/* Selected Station Detail */}
          {selectedStation && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedStation(null)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{selectedStation.stationName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedStation.stationId}</p>
                </div>
                <button
                  onClick={handleRefreshStation}
                  disabled={routesLoading || arrivalsLoading}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  aria-label="새로고침"
                >
                  {routesLoading || arrivalsLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Climate Filter for Station Routes */}
              <div className="mb-3">
                <QuickActions
                  onNearbyClick={handleNearbyClick}
                  onClimateOnlyClick={() => setClimateOnly(!climateOnly)}
                  climateOnly={climateOnly}
                  isLoadingLocation={isLoadingLocation}
                />
              </div>

              {routesLoading ? (
                <div className="space-y-2">
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                </div>
              ) : sortedFilteredRoutes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      경유 노선
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-secondary rounded-md p-0.5">
                        <button
                          onClick={() => setSortBy('arrivalTime')}
                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            sortBy === 'arrivalTime'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          도착시간순
                        </button>
                        <button
                          onClick={() => setSortBy('routeOrder')}
                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            sortBy === 'routeOrder'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          노선순서순
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                        {sortedFilteredRoutes.length}개
                      </span>
                    </div>
                  </div>
                  {sortedFilteredRoutes.map(route => {
                    const arrival = arrivals.find(a => a.routeId === route.routeId);
                    // "곧 도착" 체크
                    const isArriving = arrival && (
                      arrival.arrmsg1?.includes('곧 도착') ||
                      arrival.arrmsg2?.includes('곧 도착')
                    );
                    return (
                      <Card
                        key={route.routeId}
                        highlighted={route.climateCardEligible}
                        className={`p-3 ${isArriving ? 'animate-pulse-arriving' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <RouteBadge routeName={route.routeName} routeType={route.routeType} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">{getRouteTypeName(route.routeType)}</div>
                            <ClimateEligibilityBadge eligible={route.climateCardEligible} />
                          </div>

                          {/* Arrival Info - 오른쪽에 배치 */}
                          {arrivalsLoading ? (
                            <div className="skeleton h-8 w-20 rounded" />
                          ) : arrival ? (
                            <div className="flex flex-col gap-1 text-right min-w-0">
                              {arrival.arrmsg1 ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className={getArrivalTextClass(arrival.traTime1, arrival.arrmsg1)}>
                                    {formatArrivalMessage(arrival.arrmsg1)}
                                  </span>
                                  {arrival.isLast1 === '1' && (
                                    <span className="text-destructive text-[10px] font-extrabold bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">막차</span>
                                  )}
                                </div>
                              ) : null}
                              {arrival.arrmsg2 ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className={getArrivalTextClass(arrival.traTime2, arrival.arrmsg2)}>
                                    {formatArrivalMessage(arrival.arrmsg2)}
                                  </span>
                                  {arrival.isLast2 === '1' && (
                                    <span className="text-destructive text-[10px] font-extrabold bg-destructive/10 px-1.5 py-0.5 rounded shrink-0">막차</span>
                                  )}
                                </div>
                              ) : null}
                              {!arrival.arrmsg1 && !arrival.arrmsg2 && (
                                <span className="text-[11px] text-muted-foreground">정보없음</span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : climateOnly ? (
                <EmptyState
                  icon="route"
                  title="기후동행카드 노선이 없습니다"
                  description="필터를 해제하면 모든 노선을 볼 수 있어요"
                />
              ) : (
                <EmptyState
                  icon="route"
                  title="경유 노선이 없습니다"
                  description="이 정류장에는 정차하는 노선이 없어요"
                />
              )}
            </div>
          )}

          {/* Selected Route Detail */}
          {selectedRoute && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 flex items-center gap-3">
                  <RouteBadge routeName={selectedRoute.routeName} routeType={selectedRoute.routeType} />
                  <div>
                    <h3 className="font-semibold text-foreground">{getRouteTypeName(selectedRoute.routeType)}</h3>
                    <ClimateEligibilityBadge eligible={selectedRoute.climateCardEligible} />
                  </div>
                </div>
              </div>

              {routeStationsLoading ? (
                <div className="space-y-2">
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                </div>
              ) : routeStations.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      경유 정류장
                    </p>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                      {routeStations.length}개
                    </span>
                  </div>
                  {routeStations.map((station, index) => (
                    <Card
                      key={station.stationId}
                      interactive
                      onClick={() => handleStationClick(station)}
                      className="p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">
                            {station.stationName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {station.stationId}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="station"
                  title="정류장 정보가 없습니다"
                  description="이 노선의 정류장 정보를 불러올 수 없어요"
                />
              )}
            </div>
          )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Search Panel - 왼쪽 고정 패널 */}
      <div className="hidden lg:flex lg:flex-col lg:w-96 xl:w-[28rem] bg-card border-r border-border shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          <h1 className="text-lg font-bold text-foreground">기후동행카드 조회</h1>
          <p className="text-xs text-muted-foreground mt-1">버스 노선 및 정류장 검색</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4">
          {searchPanelContent}
        </div>
      </div>

      {/* Map + Mobile Bottom Sheet */}
      <div className="flex-1 relative">
        {/* 문의 버튼 */}
        <button
          onClick={handleOpenChat}
          className="absolute top-6 left-6 z-50 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-200"
          aria-label="카카오톡 오픈챗 문의"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Map Area */}
        <div className="w-full h-full lg:p-4 p-4">
          <Map
            center={center}
            style={{ width: "100%", height: "100%" }}
            level={3}
            isPanto={false}
            onDragEnd={handleDragEnd}
            ref={mapRef}
          >
            {userLocation && (
              <MapMarker
                position={{ lat: userLocation.lat, lng: userLocation.lng }}
                image={{
                  src: "/marker.png",
                  size: { width: 40, height: 60 },
                }}
              />
            )}

            {displayedStations.map((station) => (
              <MapMarker
                key={`station-${station.stationId}`}
                position={{ lat: Number(station.latitude), lng: Number(station.longitude) }}
                title={station.stationName}
                onClick={() => handleStationClick(station)}
                clickable={true}
                zIndex={1}
              />
            ))}
          </Map>
        </div>

        {/* Mobile Bottom Sheet */}
        <div className="lg:hidden">
          <BottomSheet contentItemCount={selectedStation ? sortedFilteredRoutes.length : selectedRoute ? routeStations.length : 0}>
            {searchPanelContent}
          </BottomSheet>
        </div>
      </div>
    </div>
  );
}

export default App;
