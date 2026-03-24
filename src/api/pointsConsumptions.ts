import { http } from "@/plugins/http";

export interface PointsConsumptionPayload {
  id?: number;
  consumedPoints?: number;
  consumedAt?: string | null;
}
export interface ConsumedPoints {
  totalPoints?: number;
  list?: {
    id: number;
    consumedPoints: number;
  }[];
}
export interface PointsConsumptionSumPayload {
  totalConsumedPoints: number;
}

export const createPointsConsumption = (payload: {
  consumedPoints: number;
  remark: string;
}) => {
  return http.post<PointsConsumptionPayload>("/points-consumptions", payload);
};
export const getPointsConsumption = (params: {
  startDate?: string;
  endDate?: string;
}) => {
  return http.get<ConsumedPoints>("/points-consumptions", { params });
};

export const getPointsConsumptionSum = () => {
  return http.get<PointsConsumptionSumPayload>("/points-consumptions/sum");
};
