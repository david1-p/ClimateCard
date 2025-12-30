import client from './client';
import type { Route, Station } from '../types/index';

export const routeApi = {
    // 노선 검색
    searchRoutes: async (keyword: string) => {
        const response = await client.get<Route[]>('/routes/search', {
            params: { keyword },
        });
        return response.data;
    },

    // 특정 노선 상세 조회
    getRouteById: async (routeId: string) => {
        const response = await client.get<Route>(`/routes/${routeId}`);
        return response.data;
    },

    // 노선의 정류소 목록 조회
    getRouteStations: async (routeId: string) => {
        const response = await client.get<Station[]>(`/routes/${routeId}/stations`);
        return response.data;
    },
};
