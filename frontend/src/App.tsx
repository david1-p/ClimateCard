import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk"
import { useState, useEffect, useRef } from "react"
import BottomSheet from "./components/Layout/BottomSheet";
import { stationApi } from "./api/station";
import { routeApi } from "./api/route";
import { arrivalApi } from "./api/arrival";
import type { Station, Route, BusArrival } from "./types/index";
import { logger } from "./utils/logger";
import { getRouteTypeName, getRouteTypeColor } from "./utils/busTypes";

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.9780 };
const DEFAULT_SEARCH_RADIUS = 2000;  // 주변 정류장 검색 반경 (미터)

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

  // 내 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(newPos); // 현재 위치로 지도 중심 이동
          setUserLocation(newPos);
          logger.log(`📍 User location: ${newPos.lat}, ${newPos.lng}`);
        },
        (err) => {
          logger.error("Geolocation error:", err);
          // 위치 권한 거부 시 서울 시청으로 유지
        }
      );
    }
  }, []);

  // 지도 중심 변경 시 주변 정류소 조회
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
      setErrorMessage("정류장 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  // 초기 로딩 시 또는 중심 변경 시 데이터 조회
  useEffect(() => {
    fetchNearbyStations(center.lat, center.lng);
  }, [center]);

  // 정류소 선택 시 노선 및 도착 정보 조회
  const handleStationClick = async (station: Station) => {
    logger.log(`🚏 Station clicked:`, station);
    setSelectedStation(station);
    setRoutesLoading(true);
    setArrivalsLoading(true);
    setErrorMessage(null);

    try {
      // 노선 정보와 도착 정보를 병렬로 조회
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
      setErrorMessage("정류소 정보를 불러오는데 실패했습니다. 다시 시도해주세요.");
      setRoutes([]);
      setArrivals([]);
    } finally {
      setRoutesLoading(false);
      setArrivalsLoading(false);
    }
  };

  // 지도 드래그 종료 시 중심 좌표 업데이트 및 재조회
  const handleDragEnd = (map: kakao.maps.Map) => {
    const latlng = map.getCenter();
    const newCenter = { lat: latlng.getLat(), lng: latlng.getLng() };
    setCenter(newCenter);
    logger.log('🗺️ Map center moved to:', newCenter);
  };

  // 노선 검색
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

  // 검색어 변경 시 검색 수행 (debounce 적용 권장되나 일단 단순 구현)
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

  if (loading) return <div className="w-full h-screen flex justify-center items-center bg-gray-50 text-gray-500 animate-pulse">지도 로딩 중...</div>
  if (error) return (
    <div className="w-full h-screen flex flex-col justify-center items-center bg-red-50 p-6 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-2">지도 로딩 실패</h2>
      <p className="text-gray-700 mb-6">{error.message}</p>
      {/*... 기존 에러 가이드 유지 ...*/}
    </div>
  );

  return (
    <div className="w-full h-screen relative overflow-hidden bg-gray-100">
      {/* 지도 영역 */}
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

        {/* 주변 정류소 마커 */}
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

      {/* Bottom Sheet UI */}
      <BottomSheet>
        <div className="space-y-3 md:space-y-4">
          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs text-red-600 hover:text-red-800 mt-1 font-medium"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 검색창 */}
          <div className="relative">
            <input
              type="text"
              placeholder="노선번호 검색 (예: 421, 150)"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 md:py-3 pl-10 text-sm md:text-base focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 absolute left-3 top-2.5 md:top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword("")}
                className="absolute right-3 top-2.5 md:top-3.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* 검색 결과 */}
          {isSearching && searchKeyword && (
            <div className="animate-fade-in">
              <h3 className="font-bold text-sm md:text-base text-gray-800 mb-2 px-1">
                노선 검색 결과 ({searchResults.length})
              </h3>
              <div className="space-y-2">
                {searchResults.map(route => (
                  <div key={route.routeId} className="flex items-center p-2.5 md:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-14 h-9 md:w-16 md:h-10 rounded flex items-center justify-center font-bold text-white text-sm md:text-base mr-2 md:mr-3 ${getRouteTypeColor(route.routeType)}`}>
                      {route.routeName}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs md:text-sm text-gray-500">
                        {getRouteTypeName(route.routeType)}
                      </div>
                      {route.climateCardEligible && (
                        <div className="text-xs text-green-600 font-semibold mt-0.5">
                          ✓ 기후동행카드 적용
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="text-center py-6 md:py-8 text-xs md:text-sm text-gray-400">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 선택된 정류소 정보 또는 주변 정류소 목록 */}
          {!isSearching && selectedStation ? (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <button onClick={() => setSelectedStation(null)} className="text-xs md:text-sm text-gray-500 hover:text-gray-800 flex items-center transition-colors">
                  ← 목록으로
                </button>
                <h3 className="font-bold text-base md:text-lg text-gray-900">{selectedStation.stationName}</h3>
              </div>

              {routesLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <svg className="animate-spin h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm">노선 정보 로딩 중...</p>
                </div>
              ) : routes.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs md:text-sm text-gray-700 font-bold bg-gray-50 p-2 rounded mb-2">
                    🚌 이 정류소의 모든 노선 ({routes.length})
                  </div>
                  {routes.map(route => {
                    const arrival = arrivals.find(a => a.routeId === route.routeId);
                    return (
                      <div key={route.routeId} className="p-2.5 md:p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <div className={`w-10 h-7 md:w-12 md:h-8 rounded flex items-center justify-center font-bold text-white text-xs md:text-sm mr-2 md:mr-3 ${getRouteTypeColor(route.routeType)}`}>
                            {route.routeName}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs md:text-sm text-gray-500">{getRouteTypeName(route.routeType)}</div>
                            {route.climateCardEligible ? (
                              <div className="text-xs text-green-600 font-semibold mt-0.5">
                                ✓ 기후동행카드 적용
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 font-semibold mt-0.5">
                                ✕ 미적용
                              </div>
                            )}
                          </div>
                        </div>
                        {arrival && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="space-y-1">
                              {arrival.arrmsg1 && (
                                <div className="flex items-center text-xs md:text-sm">
                                  <span className="text-blue-600 font-semibold mr-2">🚌</span>
                                  <span className="text-gray-700">{arrival.arrmsg1}</span>
                                  {arrival.isLast1 === '1' && <span className="ml-2 text-orange-600 font-semibold">막차</span>}
                                </div>
                              )}
                              {arrival.arrmsg2 && (
                                <div className="flex items-center text-xs md:text-sm">
                                  <span className="text-gray-400 font-semibold mr-2">🚌</span>
                                  <span className="text-gray-500">{arrival.arrmsg2}</span>
                                  {arrival.isLast2 === '1' && <span className="ml-2 text-orange-600 font-semibold">막차</span>}
                                </div>
                              )}
                              {!arrival.arrmsg1 && !arrival.arrmsg2 && (
                                <div className="text-xs text-gray-400">도착 정보 없음</div>
                              )}
                            </div>
                          </div>
                        )}
                        {!arrival && arrivalsLoading && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-400">도착 정보 로딩 중...</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
                  이 정류소에 정차하는 노선이 없습니다.
                </div>
              )}
            </div>
          ) : !isSearching ? (
            <div>
              <h3 className="font-bold text-sm md:text-base text-gray-800 mb-2 px-1">주변 정류소 ({stations.length})</h3>
              {stationsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <svg className="animate-spin h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm">주변 정류장을 검색하는 중...</p>
                </div>
              ) : (
              <div className="space-y-1.5 md:space-y-2">
                {stations.map((station) => (
                  <div
                    key={station.stationId}
                    className="flex items-center p-2.5 md:p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 active:bg-gray-100"
                    onClick={() => handleStationClick(station)}
                  >
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl md:text-2xl mr-2.5 md:mr-3 shrink-0">
                      🚏
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm md:text-base text-gray-800 truncate">{station.stationName}</div>
                      <div className="text-xs text-gray-500 truncate">{station.stationId} • {Math.round(station.distance || 0)}m</div>
                    </div>
                  </div>
                ))}
                {stations.length === 0 && (
                  <div className="text-center py-6 md:py-8 text-xs md:text-sm text-gray-400">
                    주변 2km 내 정류소가 없습니다.
                  </div>
                )}
              </div>
              )}
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </div>
  )
}

export default App
