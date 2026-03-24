import { http } from "@/plugins/http";

export interface ExtraPointRecord {
  id?: number | string;
  userId?: string | number | null;
  points?: number;
  remark?: string;
  createdAt?: string | null;
  consumedAt?: string | null;
}

export interface ExtraPointsPayload {
  totalPoints?: number;
  list?: ExtraPointRecord[];
}

export const createExtraPoints = (payload: {
  points: number;
  remark: string;
}) => {
  return http.post<ExtraPointRecord>("/extra-points", payload);
};

export const getExtraPoints = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return http.get<ExtraPointsPayload>("/extra-points", { params });
};
