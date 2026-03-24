import type { App, InjectionKey, Plugin } from "vue";
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { ElMessage } from "element-plus";
import {
  startRequestLoading,
  stopRequestLoading,
} from "@/stores/requestLoading";

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  msg?: string;
  data: T;
}

export interface HttpClient {
  request<T = unknown>(config: AxiosRequestConfig): Promise<T>;
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const getStatusMessage = (status?: number) => {
  switch (status) {
    case 400:
      return "请求参数错误";
    case 401:
      return "登录已过期，请重新登录";
    case 403:
      return "没有权限访问该资源";
    case 404:
      return "请求资源不存在";
    case 500:
      return "服务器开小差了，请稍后重试";
    case 502:
      return "网关错误，请稍后重试";
    case 503:
      return "服务暂不可用";
    default:
      return "请求失败，请稍后重试";
  }
};

const isWrappedResponse = (value: unknown): value is ApiResponse<unknown> => {
  return typeof value === "object" && value !== null && "code" in value;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === "[object Object]";
};

const toCamelCaseKey = (key: string) => {
  const normalized = key.replace(/[-_]+([a-zA-Z0-9])/g, (_, char: string) => {
    return char.toUpperCase();
  });
  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
};

const toCamelCaseDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCaseDeep(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const transformed = Object.entries(value).reduce<Record<string, unknown>>(
    (acc, [key, val]) => {
      acc[toCamelCaseKey(key)] = toCamelCaseDeep(val);
      return acc;
    },
    {},
  );

  return transformed as T;
};

const unwrapPayload = (payload: unknown) => {
  if (!isWrappedResponse(payload)) {
    return toCamelCaseDeep(payload);
  }

  if (payload.code === 0 || payload.code === 200) {
    return toCamelCaseDeep(payload.data);
  }

  const errorMessage = payload.message || payload.msg || "请求失败";
  ElMessage.error(errorMessage);
  throw new Error(errorMessage);
};

const createHttpClient = (): HttpClient => {
  const instance: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 10_000,
    withCredentials: true,
  });

  instance.interceptors.request.use(
    (config) => {
      startRequestLoading();
      return config;
    },
    (error) => {
      stopRequestLoading();
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      stopRequestLoading();
      return response;
    },
    (error: AxiosError<{ message?: string; msg?: string }>) => {
      stopRequestLoading();
      const message =
        error.response?.data?.msg ||
        error.response?.data?.message ||
        getStatusMessage(error.response?.status) ||
        error.message ||
        "网络异常，请检查网络连接";

      ElMessage.error(message);
      return Promise.reject(error);
    },
  );

  return {
    request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
      return instance
        .request(config)
        .then((response: AxiosResponse<unknown>) => {
          return unwrapPayload(response.data) as T;
        });
    },
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance
        .get(url, config)
        .then((response: AxiosResponse<unknown>) => {
          return unwrapPayload(response.data) as T;
        });
    },
    post<T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig,
    ): Promise<T> {
      return instance
        .post(url, data, config)
        .then((response: AxiosResponse<unknown>) => {
          return unwrapPayload(response.data) as T;
        });
    },
    put<T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig,
    ): Promise<T> {
      return instance
        .put(url, data, config)
        .then((response: AxiosResponse<unknown>) => {
          return unwrapPayload(response.data) as T;
        });
    },
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance
        .delete(url, config)
        .then((response: AxiosResponse<unknown>) => {
          return unwrapPayload(response.data) as T;
        });
    },
  };
};

export const http = createHttpClient();
export const httpKey: InjectionKey<HttpClient> = Symbol("http");

const HttpPlugin: Plugin = {
  install(app: App) {
    app.provide(httpKey, http);
    app.config.globalProperties.$http = http;
  },
};

export default HttpPlugin;
