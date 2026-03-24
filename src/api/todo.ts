import { http } from "@/plugins/http";

export interface TodoConfigItemResponse {
  id: string | number;
  title: string;
  completed?: boolean;
  enabled?: boolean;
  builtIn?: boolean;
  sortOrder?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export const getTodoConfig = () => {
  return http.get<TodoConfigItemResponse[]>("/todo-config");
};

export const createTodoConfig = (title: string) => {
  return http.post<TodoConfigItemResponse>("/todo-config", { title });
};

export const deleteTodoConfig = (id: string) => {
  return http.delete(`/todo-config/${id}`);
};
