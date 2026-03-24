import { ref } from "vue";

export const dailyPointsRefreshKey = ref(0);

export const triggerDailyPointsRefresh = () => {
  dailyPointsRefreshKey.value += 1;
};
