import { http } from "@/plugins/http";

const toGrowthDays = (value: unknown) => {
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
    record.count,
    record.totalCount,
    record.total_count,
    record.days,
    record.totalDays,
    record.total_days,
  ];

  for (const candidate of candidates) {
    const parsed = toGrowthDays(candidate);
    if (parsed > 0 || candidate === 0) {
      return parsed;
    }
  }

  return 0;
};

export const getEatingCount = async () => {
  const response = await http.get<unknown>("/daily-points/eating-count");
  return toGrowthDays(response);
};
