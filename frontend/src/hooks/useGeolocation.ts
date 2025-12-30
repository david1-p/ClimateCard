import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

/**
 * 사용자 위치 정보 Hook
 */
export function useGeolocation() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울시청
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

          // 위치 권한 거부 시 사용자에게 알림
          if (err.code === err.PERMISSION_DENIED) {
            setErrorMessage("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.");
          } else if (err.code === err.TIMEOUT) {
            setErrorMessage("위치 정보를 가져오는 데 시간이 너무 오래 걸립니다.");
          } else {
            setErrorMessage("위치 정보를 가져올 수 없습니다.");
          }
        },
        {
          enableHighAccuracy: true, // GPS 사용 (iPhone에서 중요)
          timeout: 5000, // 5초 타임아웃
          maximumAge: 0 // 캐시된 위치 사용 안 함
        }
      );
    }
  }, []);

  return { userLocation, center, setCenter, errorMessage, setErrorMessage };
}
