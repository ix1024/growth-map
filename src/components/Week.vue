<script setup lang="ts">
import dayjs from "dayjs";
import { dailyPointsRefreshKey } from "@/stores/dailyPointsSync";
import { useGStore } from "@/stores/global";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const today = dayjs();
const monday = today.subtract((today.day() + 6) % 7, "day");
const weekLoading = ref(false);
const g = useGStore();

const weekDateLabels = computed(() => {
  return weekdays.map((_, index) => monday.add(index, "day").format("MM-DD"));
});
const todayLabel = today.format("MM-DD");

const weekScores = computed(() => {
  return weekdays.map((_, index) => {
    const key = monday.add(index, "day").format("YYYY-MM-DD");
    return Number(g.monthlyPoints[key]?.points ?? 0);
  });
});
const weekAttitudeScores = computed(() => {
  return weekdays.map((_, index) => {
    const key = monday.add(index, "day").format("YYYY-MM-DD");
    return Number(g.monthlyPoints[key]?.attitudePoints ?? 0);
  });
});
const weekExtraScores = computed(() => {
  return weekdays.map((_, index) => {
    const key = monday.add(index, "day").format("YYYY-MM-DD");
    return Number(g.monthlyPoints[key]?.extraPoints ?? 0);
  });
});
const weekConsumedScores = computed(() => {
  return weekdays.map((_, index) => {
    const key = monday.add(index, "day").format("YYYY-MM-DD");
    return Number(g.monthlyPoints[key]?.consumedPoints ?? 0);
  });
});
const weekDailyTotalScores = computed(() => {
  return weekdays.map((_, index) => {
    return (
      (weekScores.value[index] ?? 0) +
      (weekAttitudeScores.value[index] ?? 0) +
      (weekExtraScores.value[index] ?? 0) -
      (weekConsumedScores.value[index] ?? 0)
    );
  });
});

const weekTotalScore = computed(() => g.weeklyTotalPoints);
const weeklyTarget = computed(() => {
  const target = Number(
    (g.config as Record<string, unknown>)?.config_value ?? 0,
  );
  return Number.isFinite(target) && target > 0 ? target : 600;
});
const weeklyProgress = computed(() => {
  if (weeklyTarget.value <= 0) return 0;
  return Math.min((weekTotalScore.value / weeklyTarget.value) * 100, 100);
});
const phoneHours = computed(() => weekTotalScore.value / 200);
const tvHours = computed(() => weekTotalScore.value / 100);
const formatHours = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
};

// 刷新本周模块数据（内部会请求 daily_points / extra_points）
const fetchWeekPoints = async () => {
  weekLoading.value = true;
  try {
    await g.getDayliyPoints();
  } catch {
  } finally {
    weekLoading.value = false;
  }
};

onMounted(() => {
  fetchWeekPoints();
});

watch(dailyPointsRefreshKey, () => {
  fetchWeekPoints();
});
</script>

<template>
  <section class="week-card">
    <div class="week-header">
      <h3>本周成就</h3>
      <div class="level">
        本周累计：{{ weekTotalScore }} 分
        <span v-if="weekLoading" class="loading-tag">加载中...</span>
      </div>
    </div>
    <div class="challenge-box">
      <div class="challenge-top">
        <span>本周挑战：{{ weeklyTarget }}</span>
        <strong>{{ weeklyProgress.toFixed(0) }}%</strong>
      </div>
      <div class="challenge-track">
        <div
          class="challenge-bar"
          :style="{ width: `${weeklyProgress}%` }"
        ></div>
      </div>
    </div>
    <div class="redeem-box">
      <div class="redeem-title">积分兑换</div>
      <div class="redeem-rule">
        200分可兑换1小时手机，100分可兑换1小时电视。
      </div>
      <div class="redeem-result">
        本周积分 {{ weekTotalScore }} 分，可兑换
        {{ formatHours(phoneHours) }} 小时手机时间，
        {{ formatHours(tvHours) }} 小时电视时间。
      </div>
    </div>

    <div class="week-grid">
      <div
        v-for="(day, index) in weekdays"
        :key="day"
        :class="[
          'day-item',
          { 'is-today': weekDateLabels[index] === todayLabel },
        ]"
      >
        <div class="day-name">{{ day }}</div>
        <div class="day-date">
          {{ weekDateLabels[index] }}
        </div>
        <div
          :class="(weekDailyTotalScores[index] ?? 0) > 0 ? '' : 'gray'"
          class="day-score"
        >
          {{ weekDailyTotalScores[index] ?? 0 }}
        </div>
        <div
          :class="(weekAttitudeScores[index] ?? 0) > 0 ? '' : 'gray'"
          class="day-attitude"
        >
          态度 +{{ weekAttitudeScores[index] ?? 0 }}
        </div>
        <div
          :class="(weekExtraScores[index] ?? 0) > 0 ? '' : 'gray'"
          class="day-extra"
        >
          额外 +{{ weekExtraScores[index] ?? 0 }}
        </div>
        <div
          :class="(weekConsumedScores[index] ?? 0) > 0 ? '' : 'gray'"
          class="day-consumed"
        >
          消耗 -{{ weekConsumedScores[index] ?? 0 }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.gray {
  color: rgba(0, 0, 0, 0.05) !important;
}
.week-card {
  width: 100%;
  max-width: 680px;
  margin: 24px auto 0;
  padding: 16px;
  border-radius: 24px;
  background: var(--week-card-bg);
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(126%);
  -webkit-backdrop-filter: blur(16px) saturate(126%);
  box-shadow: 0 14px 30px rgba(98, 63, 126, 0.16);
  line-height: 1.2;
}

.week-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 24px;
    color: #5a2f73;
  }
}

.level {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 13px;
  color: #4c376a;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-tag {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #5c6f92;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(86px, 1fr));
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 15px;
  padding-top: 6px;
}

.challenge-box {
  margin: 10px 0 6px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.62);
}

.challenge-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #4e5f84;

  strong {
    font-size: 15px;
    color: #3b2d5b;
  }
}

.challenge-track {
  margin-top: 8px;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  overflow: hidden;
}

.challenge-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  transition: width 0.28s ease;
}

.redeem-box {
  margin: 10px 0 4px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  background: rgba(255, 255, 255, 0.54);
}

.redeem-title {
  font-size: 14px;
  font-weight: 800;
  color: #4b356d;
}

.redeem-rule {
  margin-top: 4px;
  font-size: 12px;
  color: #607092;
}

.redeem-result {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #3f5078;
}

.day-item {
  padding: 10px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  min-width: 86px;
}

.is-today {
  border-color: var(--sub-accent);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--sub-accent) 30%, transparent);
  transform: translateY(-2px);
}

.day-name {
  font-size: 13px;
  color: #74538a;
}

.day-date {
  margin-top: 4px;
  font-size: 12px;
  color: #6f7a96;
}

.today-tag {
  margin-left: 6px;
  color: var(--sub-accent);
  font-weight: 700;
}

.day-score {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--main-accent);
}

.day-attitude {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: #2f8f67;
}

.day-extra {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
}

.day-consumed {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 700;
  color: #dc2626;
}

@media (max-width: 768px) {
  .week-card {
    margin-top: 16px;
    border-radius: 20px;
  }

  .week-header h3 {
    font-size: 20px;
  }
}
</style>
