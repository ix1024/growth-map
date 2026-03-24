import { http } from "@/plugins/http";
import type { AuthUser } from "@/api/auth";

export interface UserProfilePayload {
  nickname?: string;
  password?: string;
  oldPassword?: string;
  avatar?: string;
  age?: number;
  birthDate?: string;
  gender?: string;
}

const normalizeOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeProfileUser = (value: unknown): AuthUser | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const rawId = record.id ?? record.userId;
  if (
    rawId === undefined ||
    rawId === null ||
    (typeof rawId !== "string" && typeof rawId !== "number")
  ) {
    return undefined;
  }

  return {
    id: String(rawId),
    username: typeof record.username === "string" ? record.username : "用户",
    nickname: typeof record.nickname === "string" ? record.nickname : "",
    email: typeof record.email === "string" ? record.email : "",
    gender: typeof record.gender === "string" ? record.gender : "",
    age: normalizeOptionalNumber(record.age),
    birthDate: typeof record.birthDate === "string" ? record.birthDate : "",
    avatar: typeof record.avatar === "string" ? record.avatar : "",
    level: Number(record.level ?? 1),
    theme: record.theme,
    isAdmin: Number(record.isAdmin ?? 0),
  };
};

export const updateUserProfile = async (payload: UserProfilePayload) => {
  const response = await http.put<Record<string, unknown>>(
    "/user/profile",
    payload,
  );
  const user = normalizeProfileUser(response);
  return {
    ...(response ?? {}),
    user,
  };
};
