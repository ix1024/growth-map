import type { AuthUser } from "@/api/auth";

const AUTH_TOKEN_KEY = "token";
const AUTH_USER_PROFILE_KEY = "auth-user-profile";

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord => {
  return typeof value === "object" && value !== null;
};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const pickUserId = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const parseAuthUser = (value: unknown): AuthUser | null => {
  if (!isObject(value)) return null;
  const id = pickUserId(value.id);
  if (!id) return null;

  return {
    id,
    username: pickString(value.username),
    nickname: pickString(value.nickname),
    email: pickString(value.email),
  };
};

const parseLoginPayload = (
  payload: unknown,
): { token: string; user: AuthUser | null } => {
  if (!isObject(payload)) {
    return { token: "", user: null };
  }

  const token = pickString(payload.token, payload.accessToken, payload.jwt);
  const user = parseAuthUser(payload.user);
  if (user) {
    return { token, user };
  }

  const id = pickUserId(payload.userId ?? payload.id);
  if (!id) {
    return { token, user: null };
  }

  return {
    token,
    user: {
      id,
      username: pickString(payload.username),
      nickname: pickString(payload.nickname),
      email: pickString(payload.email),
    },
  };
};

const saveAuthUser = (user: AuthUser) => {
  localStorage.setItem(AUTH_USER_PROFILE_KEY, JSON.stringify(user));
};

export const saveLoginSession = (payload: unknown) => {
  const { token, user } = parseLoginPayload(payload);

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (user) {
    saveAuthUser(user);
  }
};

export const saveCheckedAuthUser = (user?: AuthUser) => {
  if (!user?.id) return;
  saveAuthUser(user);
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_PROFILE_KEY);
};
