import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  createTodoConfig,
  deleteTodoConfig,
  getTodoConfig,
  type TodoConfigItemResponse,
} from "@/api/todo";

export type TODOITEM = {
  id: string;
  title: string;
  completed: boolean;
};

export type TODOCONFIGITEM = TODOITEM & {
  enabled: boolean;
  builtIn: boolean;
};

const defaultItems: TODOCONFIGITEM[] = [];

export const useTodoStore = defineStore("todo", () => {
  const title = ref("今日待办");
  const items = ref<TODOCONFIGITEM[]>([...defaultItems]);
  const loading = ref(false);
  const error = ref("");

  const visibleItems = computed(() =>
    items.value.filter((item) => item.enabled),
  );

  const normalizeItem = (item: TodoConfigItemResponse): TODOCONFIGITEM => {
    const builtInIds = new Set(
      defaultItems.map((defaultItem) => defaultItem.id),
    );
    const id = String(item.id);
    return {
      id,
      title: item.title,
      // completion state comes from /daily-points/today, not from todo-config.
      completed: false,
      enabled: item.enabled ?? true,
      builtIn: item.builtIn ?? builtInIds.has(id),
    };
  };

  const fetchTodoConfig = async () => {
    loading.value = true;
    error.value = "";
    try {
      const list = await getTodoConfig();
      if (Array.isArray(list) && list.length > 0) {
        items.value = list.map(normalizeItem);
      } else {
        items.value = [...defaultItems];
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "获取待办配置失败";
      items.value = [...defaultItems];
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addTodoItem = async (titleText: string) => {
    const newTitle = titleText.trim();
    if (!newTitle) return false;

    const existed = items.value.some((item) => item.title === newTitle);
    if (existed) return false;

    const created = await createTodoConfig(newTitle);
    if (created && created.id !== undefined && created.id !== null) {
      items.value.push(normalizeItem(created));
    } else {
      items.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: newTitle,
        completed: false,
        enabled: true,
        builtIn: false,
      });
    }
    return true;
  };

  const removeCustomTodoItem = async (id: string) => {
    const target = items.value.find((item) => item.id === id);
    if (!target || target.builtIn) return false;
    await deleteTodoConfig(id);
    items.value = items.value.filter((item) => item.id !== id);
    return true;
  };

  return {
    title,
    items,
    visibleItems,
    loading,
    error,
    fetchTodoConfig,
    addTodoItem,
    removeCustomTodoItem,
  };
});
