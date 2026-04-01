<script setup lang="ts">
import dayjs from "dayjs";
import { dailyPointsRefreshKey } from "@/stores/dailyPointsSync";
import { MONTHLY_ACHIEVEMENT_CONFIG } from "@/config/monthAchievement";
import { useGStore } from "@/stores/global";
const g = useGStore();
const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
const currentMonth = ref(dayjs().startOf("month"));
const monthLoading = ref(false);

const monthTitle = computed(() => currentMonth.value.format("YYYY年MM月"));
const daysInMonth = computed(() => currentMonth.value.daysInMonth());
const monthOffset = computed(() => {
  const weekDay = currentMonth.value.day();
  return (weekDay + 6) % 7;
});
const dayCells = computed(() => {
  return Array.from({ length: daysInMonth.value }, (_, index) => index + 1);
});

const monthTotalScore = computed(() => {
  return dayCells.value.reduce((sum, day) => sum + getDayTotalScore(day), 0);
});
const availableAchievementPoints = computed(() =>
  Math.max(Number(g.availablePoints || 0), 0),
);
const requiredCheckinDays = computed(
  () => MONTHLY_ACHIEVEMENT_CONFIG.requiredStreakDays,
);
const isContinuousCheckin = computed(() => {
  if (!MONTHLY_ACHIEVEMENT_CONFIG.requireContinuousCheckin) return true;
  return (
    requiredCheckinDays.value > 0 &&
    monthMaxStreak.value >= requiredCheckinDays.value
  );
});
const monthlyCompletionPercent = computed(() => {
  const target = MONTHLY_ACHIEVEMENT_CONFIG.targetPoints;
  if (target <= 0) return 0;
  return (availableAchievementPoints.value / target) * 100;
});
const rewardStatusList = computed(() =>
  MONTHLY_ACHIEVEMENT_CONFIG.rewards.map((rule) => {
    const targetPoints = Math.ceil(
      (MONTHLY_ACHIEVEMENT_CONFIG.targetPoints * rule.percent) / 100,
    );
    const remainingPoints = Math.max(
      targetPoints - availableAchievementPoints.value,
      0,
    );
    return {
      ...rule,
      targetPoints,
      remainingPoints,
      reached: remainingPoints <= 0,
    };
  }),
);

const prevMonth = () => {
  currentMonth.value = currentMonth.value.subtract(1, "month");
};

const nextMonth = () => {
  currentMonth.value = currentMonth.value.add(1, "month");
};

const isToday = (day: number) => {
  return currentMonth.value.date(day).isSame(dayjs(), "day");
};

const isFutureDay = (day: number) => {
  return currentMonth.value.isSame(dayjs(), "month") && day > dayjs().date();
};

const getDayScore = (day: number) => {
  if (isFutureDay(day)) return 0;
  const key = currentMonth.value.date(day).format("YYYY-MM-DD");
  return Number(g.monthlyPoints[key]?.points ?? 0);
};
const getDayExtraScore = (day: number) => {
  if (isFutureDay(day)) return 0;
  const key = currentMonth.value.date(day).format("YYYY-MM-DD");
  return Number(g.monthlyPoints[key]?.extraPoints ?? 0);
};
const getDayTotalScore = (day: number) => {
  return (
    getDayScore(day) +
    getDayAttitudeScore(day) +
    getDayExtraScore(day) -
    getDayConsumedScore(day)
  );
};
const getDayAttitudeScore = (day: number) => {
  if (isFutureDay(day)) return 0;
  const key = currentMonth.value.date(day).format("YYYY-MM-DD");
  return Number(g.monthlyPoints[key]?.attitudePoints ?? 0);
};
const getDayConsumedScore = (day: number) => {
  if (isFutureDay(day)) return 0;
  const key = currentMonth.value.date(day).format("YYYY-MM-DD");
  return Number(g.monthlyPoints[key]?.consumedPoints ?? 0);
};

const monthMaxStreak = computed(() => {
  let currentStreak = 0;
  let maxStreak = 0;
  for (let day = 1; day <= daysInMonth.value; day += 1) {
    const key = currentMonth.value.date(day).format("YYYY-MM-DD");
    const dayData = g.monthlyPoints[key];
    const hasCheckin =
      Number(dayData?.points ?? 0) > 0 ||
      Number(dayData?.attitudePoints ?? 0) > 0 ||
      Number(dayData?.extraPoints ?? 0) > 0;
    if (hasCheckin) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return maxStreak;
});

// 刷新当前月份数据（内部会请求 daily_points / extra_points）
const fetchMonthPoints = async () => {
  monthLoading.value = true;
  try {
    await g.getDayliyPoints(currentMonth.value.format("YYYY-MM-DD"));
  } catch {
  } finally {
    monthLoading.value = false;
  }
};

watch(currentMonth, () => {
  fetchMonthPoints();
});

onMounted(() => {
  fetchMonthPoints();
});

watch(dailyPointsRefreshKey, () => {
  fetchMonthPoints();
});
</script>

<template>
  <section class="month-card">
    <div class="month-header">
      <h3>{{ MONTHLY_ACHIEVEMENT_CONFIG.title }}</h3>
      <div class="actions">
        <button type="button" @click="prevMonth">上个月</button>
        <span class="title">{{ monthTitle }}</span>
        <button type="button" @click="nextMonth">下个月</button>
      </div>
    </div>

    <div class="summary">
      当月累计：{{ monthTotalScore }} 分
      <span v-if="monthLoading" class="summary-loading">（加载中...）</span>
    </div>
    <div class="achievement-box">
      <div class="achievement-title">
        成就目标：可用积分目标 {{ MONTHLY_ACHIEVEMENT_CONFIG.targetPoints }} 分
      </div>
      <div class="achievement-rows">
        <div class="achievement-item">
          <span>连续打卡</span>
          <strong :class="{ ok: isContinuousCheckin }">
            最大连续 {{ monthMaxStreak }} 天 / 目标 {{ requiredCheckinDays }} 天
          </strong>
        </div>
        <div class="achievement-item">
          <span>可用积分</span>
          <strong :class="{ ok: monthlyCompletionPercent >= 100 }">
            {{ availableAchievementPoints }}/{{
              MONTHLY_ACHIEVEMENT_CONFIG.targetPoints
            }}
            （{{ monthlyCompletionPercent.toFixed(1) }}%）
          </strong>
        </div>
      </div>
      <div class="reward-list">
        <div
          v-for="item in rewardStatusList"
          :key="`${item.percent}-${item.rewardName}`"
          :class="[
            'achievement-result',
            { unlocked: item.reached, locked: !item.reached },
          ]"
        >
          <div class="reward-main">
            <span class="reward-name">{{ item.rewardName }}</span>
            <span class="reward-threshold">
              目标 {{ item.percent }}%（{{ item.targetPoints }} 分）·
              {{ item.reached ? "已达标" : `还差 ${item.remainingPoints} 分` }}
            </span>
          </div>
          <span class="reward-state">{{
            item.reached ? "已解锁" : "未解锁"
          }}</span>
        </div>
      </div>
    </div>

    <div class="calendar">
      <div v-for="label in weekLabels" :key="label" class="weekday">
        {{ label }}
      </div>
      <div
        v-for="empty in monthOffset"
        :key="`empty-${empty}`"
        class="empty"
      ></div>
      <div
        v-for="day in dayCells"
        :key="day"
        :class="['cell', { today: isToday(day) }]"
      >
        <div class="day">{{ day }}</div>
        <div :class="getDayTotalScore(day) > 0 ? '' : 'gray'" class="score">
          积分 {{ getDayTotalScore(day) }}
        </div>
        <div
          :class="getDayExtraScore(day) > 0 ? '' : 'gray'"
          class="extra-score"
        >
          额外 +{{ getDayExtraScore(day) }}
        </div>
        <div
          :class="getDayAttitudeScore(day) > 0 ? '' : 'gray'"
          class="attitude-score"
        >
          态度 +{{ getDayAttitudeScore(day) }}
        </div>
        <div
          :class="getDayConsumedScore(day) > 0 ? '' : 'gray'"
          class="consumed-score"
        >
          消耗 -{{ getDayConsumedScore(day) }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.gray {
  color: rgba(0, 0, 0, 0.05) !important;
}
.month-card {
  width: 100%;
  max-width: 680px;
  margin: 24px auto 0;
  padding: 16px;
  border-radius: 24px;
  background: var(--month-card-bg);
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(126%);
  -webkit-backdrop-filter: blur(16px) saturate(126%);
  box-shadow: 0 14px 30px rgba(62, 110, 154, 0.18);
}

.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 24px;
    color: #214d76;
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    border: 1px solid #97c9ef;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.74),
      rgba(241, 250, 255, 0.6)
    );
    border-radius: 999px;
    padding: 6px 12px;
    cursor: pointer;
    color: #2f5b82;
    font-weight: 700;
    transition: all 0.2s ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(83, 149, 204, 0.2);
  }
}

.title {
  min-width: 102px;
  text-align: center;
  font-size: 15px;
  color: #335f88;
  font-weight: 700;
}

.summary {
  margin-top: 10px;
  font-size: 14px;
  color: #315b82;
  font-weight: 700;
}

.summary-loading {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #637ea1;
}

.achievement-box {
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.66);
}

.achievement-title {
  font-size: 13px;
  font-weight: 700;
  color: #2e557b;
}

.achievement-rows {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}

.achievement-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #446689;

  strong {
    color: #6d7f99;
  }

  .ok {
    color: #1f9f64;
  }
}

.achievement-result {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.achievement-result.unlocked {
  color: #1f9f64;
  background: linear-gradient(
    120deg,
    rgba(88, 214, 141, 0.25),
    rgba(127, 255, 212, 0.12)
  );
  border-color: rgba(53, 180, 113, 0.7);
  box-shadow: 0 8px 18px rgba(31, 159, 100, 0.2);
}

.achievement-result.locked {
  color: #8d95a6;
  background: rgba(203, 209, 222, 0.28);
  border-color: rgba(177, 186, 205, 0.7);
  filter: grayscale(0.15);
}

.reward-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.reward-name {
  font-size: 13px;
  font-weight: 800;
}

.reward-threshold {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
}

.reward-state {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  height: 24px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.7);
}

.achievement-result.unlocked .reward-state {
  color: #0f8e55;
  border: 1px solid rgba(53, 180, 113, 0.6);
}

.achievement-result.locked .reward-state {
  color: #71798a;
  border: 1px solid rgba(163, 172, 189, 0.72);
}

.reward-list {
  margin-top: 8px;
}

.calendar {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  line-height: 1.2;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: #5b7c99;
}

.empty {
  min-height: 64px;
}

.cell {
  min-height: 64px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 6px;
}

.today {
  border-color: var(--main-accent);
  box-shadow: 0 6px 12px color-mix(in srgb, var(--main-accent) 28%, transparent);
  transform: translateY(-2px);
}

.day {
  font-size: 12px;
  color: #2a4a66;
}

.score {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 800;
  color: var(--main-accent);
}

.attitude-score {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #2f8f67;
}

.extra-score {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #d97706;
}

.consumed-score {
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
}

@media (max-width: 768px) {
  .month-card {
    margin-top: 16px;
    border-radius: 20px;
  }

  .month-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
    justify-content: space-between;
  }

  .reward-state {
    height: 22px;
    padding: 0 8px;
    font-size: 11px;
  }
}
</style>
