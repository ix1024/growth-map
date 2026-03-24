import { http } from "@/plugins/http";

export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  gender?: string;
  age?: number;
  birthDate?: string;
  theme?: string;
  avatar?: string;
  level?: number;
  isAdmin?: number;
}

export interface AuthCheckPayload {
  loggedIn: boolean;
  user?: AuthUser;
}

export interface CaptchaPayload {
  captchaId: string;
  captchaImage: string;
}

const normalizeOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeAuthUser = (value: unknown): AuthUser | undefined => {
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

export const login = async (payload: {
  username: string;
  password: string;
}) => {
  const response = await http.post<Record<string, unknown>>(
    "/auth/login",
    payload,
  );
  const user = normalizeAuthUser(response);
  return {
    ...(response ?? {}),
    user,
  };
};

export const register = async (payload: {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
  nickname: string;
}) => {
  const response = await http.post<Record<string, unknown>>(
    "/auth/register",
    payload,
  );
  const user = normalizeAuthUser(response);
  return {
    ...(response ?? {}),
    user,
  };
};

const normalizeCaptchaImage = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  return trimmed.startsWith("data:") ? trimmed : `data:image/png;base64,${trimmed}`;
};

const normalizeCaptchaPayload = (value: unknown): CaptchaPayload => {
  if (!value || typeof value !== "object") {
    return { captchaId: "", captchaImage: "" };
  }
  const record = value as Record<string, unknown>;
  const captchaId = [
    record.captchaId,
    record.captcha_id,
    record.id,
    record.uuid,
  ].find((item) => typeof item === "string" && item.trim());
  const captchaImage = normalizeCaptchaImage(
    record.captchaImage ??
      record.captcha_image ??
      record.image ??
      record.img ??
      record.svg ??
      record.data,
  );

  return {
    captchaId: typeof captchaId === "string" ? captchaId.trim() : "",
    captchaImage,
  };
};

export const getCaptcha = async () => {
  const response = await http.get<Record<string, unknown>>("/auth/captcha");
  return normalizeCaptchaPayload(response);
};

export const checkAuth = async () => {
  const response = await http.get<AuthCheckPayload>("/auth/check");
  return {
    loggedIn: Boolean(response?.loggedIn),
    user: normalizeAuthUser(response?.user),
  } as AuthCheckPayload;
};

export const logout = () => {
  return http.post("/auth/logout");
};

export const setTheme = (theme: string) => {
  return http.put("/user/theme", { theme });
};
