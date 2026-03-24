import { computed, ref } from "vue";

const requestCount = ref(0);

export const startRequestLoading = () => {
  requestCount.value += 1;
};

export const stopRequestLoading = () => {
  requestCount.value = Math.max(requestCount.value - 1, 0);
};

export const isRequestLoading = computed(() => requestCount.value > 0);
