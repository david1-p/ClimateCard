import client from './client';
import type { BusArrival } from '../types/index';

export const arrivalApi = {
    // 정류소별 버스 도착 정보 조회
    getArrivalsByStation: async (stationId: string) => {
        const response = await client.get<BusArrival[]>(`/arrivals/station/${stationId}`);
        return response.data;
    },
};
