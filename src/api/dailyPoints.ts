import { http } from "@/plugins/http";

export interface DailyPointRecord {
  id: number | string | null;
  userId?: string | number | null;
  recordDate: string;
  points: number;
  attitudePoints?: number;
  selectedIds?: number[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface DailyPointsPayload {
  startDate: string;
  endDate: string;
  list: DailyPointRecord[];
  userId?: string | number | null;
}

export interface DailyPointsSumPayload {
  userId?: string | number | null;
  today?: {
    date?: string;
    totalPoints?: number;
  };
  week?: {
    startDate?: string;
    endDate?: string;
    totalPoints?: number;
    attitudePoints?: number;
  };
  month?: {
    startDate?: string;
    endDate?: string;
    totalPoints?: number;
  };
  total?: {
    totalPoints?: number;
    consumedPoints?: number;
    availablePoints?: number;
  };
}

export interface MonthMaxStreakPayload {
  currentDate?: string;
  userId?: string | number | null;
  monthStartDate?: string;
  monthEndDate?: string;
  maxStreak?: number;
}

export const getDailyPoints = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return http.get<DailyPointsPayload>("/daily-points", { params });
};

export const getDailyPointsSum = (params?: {
}) => {
  return http.get<DailyPointsSumPayload>("/daily-points/sum", { params });
};

export const getTodayDailyPoints = (params?: {
}) => {
  return http.get<DailyPointRecord>("/daily-points/today", { params });
};

export const getMonthMaxStreak = (params: {
  currentDate: string;
}) => {
  return http.get<MonthMaxStreakPayload>("/daily-points/month-max-streak", {
    params,
  });
};

export const upsertDailyPoints = (payload: {
  recordDate?: string;
  points?: number;
  attitudePoints?: number;
  selectedIds?: number[];
}) => {
  return http.put<DailyPointRecord>("/daily-points", payload);
};

export const updateAttitudePoints = (payload: {
  recordDate?: string;
  attitudePoints: number;
}) => {
  return http.put<DailyPointRecord>("/daily-points/attitude", payload);
};
