/**
 * 버스 노선 타입 유틸리티
 */

export interface BusTypeInfo {
  name: string;
  color: string; // Tailwind 색상 클래스
  bgClass: string;
}

/**
 * 노선 타입 코드를 한글 이름으로 변환
 */
export function getRouteTypeName(routeType: string): string {
  const typeMap: Record<string, string> = {
    '0': '광역',
    '1': '공항',
    '2': '마을',
    '3': '간선',
    '4': '지선',
    '5': '순환',
    '6': '광역급행',
    '7': '인천',
    '8': '경기',
    '10': '관광',
    '13': '심야',
    '14': 'M버스',
    '15': '맞춤형',
  };

  return typeMap[routeType] || '기타';
}

/**
 * 노선 타입에 따른 색상 정보 반환 (서울시 버스 공식 색상)
 */
export function getRouteTypeColor(routeType: string): string {
  const colorMap: Record<string, string> = {
    '0': 'bg-red-600',       // 광역버스 (8xxx) - 진한 빨강 (서울시 공식)
    '1': 'bg-orange-600',    // 공항버스 - 주황
    '2': 'bg-green-500',     // 마을버스 - 연두색 (서울시 공식)
    '3': 'bg-blue-600',      // 간선버스 (421, 146 등) - 진한 파랑 (서울시 공식)
    '4': 'bg-green-600',     // 지선버스 (3321, 3413 등) - 초록 (서울시 공식)
    '5': 'bg-yellow-500',    // 순환버스 - 노랑
    '6': 'bg-red-700',       // 광역급행버스 - 더 진한 빨강
    '7': 'bg-purple-500',    // 인천버스 - 보라
    '8': 'bg-indigo-500',    // 경기버스 - 남색
    '10': 'bg-pink-500',     // 관광버스 - 핑크
    '13': 'bg-blue-500',     // 심야버스 - 파랑 (서울시 공식)
    '14': 'bg-cyan-600',     // M버스/한강버스 - 청록
    '15': 'bg-teal-500',     // 맞춤형버스 - 청록
  };

  return colorMap[routeType] || 'bg-gray-500';
}

/**
 * 노선 타입 정보 전체 반환
 */
export function getRouteTypeInfo(routeType: string): BusTypeInfo {
  return {
    name: getRouteTypeName(routeType),
    color: getRouteTypeColor(routeType),
    bgClass: getRouteTypeColor(routeType),
  };
}
