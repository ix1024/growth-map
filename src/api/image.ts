import { http } from "@/plugins/http";

export interface ImageItem {
  id: number;
  userId: number;
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  createdAt?: string;
}

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return http.post<ImageItem>("/image/upload", formData);
};
