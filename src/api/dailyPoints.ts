import { http } from "@/plugins/http";

export interface DailyPointRecord {
  id: number | string | null;
  userId?: string | number | null;
  recordDate: string;
  points: number;
  attitudePoints?: number;
  eating?: number;
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

export interface UserTotalSumPayload {
  userId?: string | number | null;
  dailyPointsTotal?: number;
  extraPointsTotal?: number;
  consumedPointsTotal?: number;
}

export interface EatingCountPayload {
  eatingCount?: number;
  eating_count?: number;
  eating?: number;
  count?: number;
  satiety?: number;
  value?: number;
}

const normalizeEatingCount = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  const record = value as Record<string, unknown>;
  const candidates = [
    record.eatingCount,
    record.eating_count,
    record.eating,
    record.count,
    record.satiety,
    record.value,
  ];

  for (const candidate of candidates) {
    const parsed = normalizeEatingCount(candidate);
    if (parsed > 0 || candidate === 0) {
      return parsed;
    }
  }

  return 0;
};

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

export const getUserTotalSum = () => {
  return http.get<UserTotalSumPayload>("/daily-points/user-total-sum");
};

export const getTodayEatingCount = () => {
  return http.get<unknown>("/daily-points/eating/today").then((response) => {
    return normalizeEatingCount(response);
  });
};

export const updateTodayEatingCount = (payload: {
  eating: number;
}) => {
  return http.put<unknown>("/daily-points/eating", payload).then((response) => {
    return normalizeEatingCount(response);
  });
};
