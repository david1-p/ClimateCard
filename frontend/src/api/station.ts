import client from './client';
import type { Station, Route } from '../types/index';

export const stationApi = {
    // 주변 정류소 조회
    getNearbyStations: async (lat: number, lng: number, radius: number = 500) => {
        const response = await client.get<Station[]>('/stations/nearby', {
            params: { lat, lng, radius },
        });
        return response.data;
    },

    // 정류소 이름으로 검색
    searchStations: async (keyword: string) => {
        const response = await client.get<Station[]>('/stations/search', {
            params: { keyword },
        });
        return response.data;
    },

    // 정류소별 기후동행카드 적용 노선 조회
    getClimateRoutes: async (stationId: string) => {
        const response = await client.get<Route[]>(`/routes/station/${stationId}/climate-eligible`);
        return response.data;
    },

    // 정류소의 모든 노선 조회
    getAllRoutes: async (stationId: string) => {
        const response = await client.get<Route[]>(`/stations/${stationId}/routes`);
        return response.data;
    },
};
