import { http } from "@/plugins/http";

export interface SystemConfigItem {
  id: number;
  configKey: string;
  configValue: string;
  valueType: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const getSystemConfigs = () => {
  return http.get<SystemConfigItem[]>("/system-config");
};
