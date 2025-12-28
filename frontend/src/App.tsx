import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk"
import { useState, useEffect, useRef } from "react"
import BottomSheet from "./components/Layout/BottomSheet";
import { Card, RouteBadge, ClimateEligibilityBadge } from "./components/ui/Card";
import { StationCardSkeleton, RouteCardSkeleton, SearchResultSkeleton } from "./components/ui/Skeleton";
import { SearchTabs } from "./components/ui/SearchTabs";
import { SearchInput } from "./components/ui/SearchInput";
import { QuickActions } from "./components/ui/QuickActions";
import { EmptyState } from "./components/ui/EmptyState";
import { stationApi } from "./api/station";
import { routeApi } from "./api/route";
import { arrivalApi } from "./api/arrival";
import type { Station, Route, BusArrival } from "./types/index";
import { logger } from "./utils/logger";
import { getRouteTypeName } from "./utils/busTypes";

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.9780 };
const DEFAULT_SEARCH_RADIUS = 2000;

function App() {
  const appKey = import.meta.env.VITE_KAKAO_APP_KEY;
  const mapRef = useRef<kakao.maps.Map>(null);

  const [loading, error] = useKakaoLoader({
    appkey: appKey,
    libraries: ["services", "clusterer"],
  });

  const [center, setCenter] = useState(SEOUL_CITY_HALL);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<Route[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);
  
  // New state for improved UI
  const [searchTab, setSearchTab] = useState<"route" | "station">("route");
  const [stationSearchKeyword, setStationSearchKeyword] = useState("");
  const [climateOnly, setClimateOnly] = useState(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newPos);
          setUserLocation(newPos);
          logger.log(`📍 User location: ${newPos.lat}, ${newPos.lng}`);
        },
        (err) => {
          logger.error("Geolocation error:", err);
        }
      );
    }
  }, []);

  // Fetch nearby stations
  const fetchNearbyStations = async (lat: number, lng: number) => {
    logger.log(`🔍 Fetching stations near: ${lat}, ${lng}`);
    setStationsLoading(true);
    setErrorMessage(null);
    try {
      const data = await stationApi.getNearbyStations(lat, lng, DEFAULT_SEARCH_RADIUS);
      logger.log(`✅ Found ${data.length} stations:`, data);
      setStations(data);
    } catch (err) {
      logger.error("❌ Failed to fetch stations:", err);
      setErrorMessage("정류장 정보를 불러오는데 실패했습니다.");
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyStations(center.lat, center.lng);
  }, [center]);

  // Handle station click
  const handleStationClick = async (station: Station) => {
    logger.log(`🚏 Station clicked:`, station);
    setSelectedStation(station);
    setRoutesLoading(true);
    setArrivalsLoading(true);
    setErrorMessage(null);

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

  // Filter stations by name
  const filteredStations = stationSearchKeyword
    ? stations.filter(s => 
        s.stationName.toLowerCase().includes(stationSearchKeyword.toLowerCase()) ||
        s.stationId.includes(stationSearchKeyword)
      )
    : stations;

  // Filter routes by climate card eligibility
  const filteredSearchResults = climateOnly
    ? searchResults.filter(r => r.climateCardEligible)
    : searchResults;

  const filteredRoutes = climateOnly
    ? routes.filter(r => r.climateCardEligible)
    : routes;

  // Handle nearby button click
  const handleNearbyClick = () => {
    if (userLocation) {
      setCenter(userLocation);
      if (mapRef.current) {
        mapRef.current.setCenter(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
      }
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

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      {/* Map Area */}
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

        {stations.map((station) => (
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

      {/* Bottom Sheet */}
      <BottomSheet>
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
          {!selectedStation && (
            <SearchTabs activeTab={searchTab} onTabChange={setSearchTab} />
          )}

          {/* Search Input & Quick Actions */}
          {!selectedStation && (
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
              />
            </div>
          )}

          {/* Route Search Results */}
          {searchTab === "route" && isSearching && searchKeyword && !selectedStation && (
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
                {searchResults.length === 0 ? (
                  <>
                    <SearchResultSkeleton />
                    <SearchResultSkeleton />
                  </>
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
          {searchTab === "route" && !searchKeyword && !selectedStation && (
            <EmptyState
              icon="search"
              title="버스 노선을 검색해보세요"
              description="노선번호를 입력하면 기후동행카드 사용 가능 여부를 확인할 수 있어요"
            />
          )}

          {/* Station Search Results */}
          {searchTab === "station" && !selectedStation && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {stationSearchKeyword ? "검색 결과" : "주변 정류장"}
                </h3>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                  {filteredStations.length}개
                </span>
              </div>
              
              {stationsLoading ? (
                <div className="space-y-2">
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                  <StationCardSkeleton />
                </div>
              ) : filteredStations.length > 0 ? (
                <div className="space-y-2">
                  {filteredStations.map((station) => (
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
              </div>

              {/* Climate Filter for Station Routes */}
              <div className="mb-3">
                <QuickActions
                  onNearbyClick={handleNearbyClick}
                  onClimateOnlyClick={() => setClimateOnly(!climateOnly)}
                  climateOnly={climateOnly}
                />
              </div>

              {routesLoading ? (
                <div className="space-y-2">
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                  <RouteCardSkeleton />
                </div>
              ) : filteredRoutes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      경유 노선
                    </p>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                      {filteredRoutes.length}개
                    </span>
                  </div>
                  {filteredRoutes.map(route => {
                    const arrival = arrivals.find(a => a.routeId === route.routeId);
                    return (
                      <Card 
                        key={route.routeId} 
                        highlighted={route.climateCardEligible}
                        className="p-3"
                      >
                        <div className="flex items-center gap-3">
                          <RouteBadge routeName={route.routeName} routeType={route.routeType} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">{getRouteTypeName(route.routeType)}</div>
                            <ClimateEligibilityBadge eligible={route.climateCardEligible} />
                          </div>
                        </div>
                        
                        {/* Arrival Info */}
                        {(arrival || arrivalsLoading) && (
                          <div className="mt-3 pt-3 border-t border-border">
                            {arrivalsLoading ? (
                              <div className="skeleton h-4 w-32 rounded" />
                            ) : arrival ? (
                              <div className="space-y-2">
                                {arrival.arrmsg1 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">1</span>
                                    <span className="text-foreground font-medium">{arrival.arrmsg1}</span>
                                    {arrival.isLast1 === '1' && (
                                      <span className="text-destructive text-[10px] font-bold bg-destructive/10 px-1.5 py-0.5 rounded">막차</span>
                                    )}
                                  </div>
                                )}
                                {arrival.arrmsg2 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-bold text-[10px]">2</span>
                                    <span className="text-muted-foreground">{arrival.arrmsg2}</span>
                                    {arrival.isLast2 === '1' && (
                                      <span className="text-destructive text-[10px] font-bold bg-destructive/10 px-1.5 py-0.5 rounded">막차</span>
                                    )}
                                  </div>
                                )}
                                {!arrival.arrmsg1 && !arrival.arrmsg2 && (
                                  <span className="text-xs text-muted-foreground">도착 정보 없음</span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        )}
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
        </div>
      </BottomSheet>
    </div>
  );
}

export default App;
