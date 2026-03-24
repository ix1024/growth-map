<script setup lang="ts">
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import { getTodayDailyPoints, updateAttitudePoints } from "@/api/dailyPoints";
import { useGStore } from "@/stores/global";
const g = useGStore();
type AttitudeOption = {
  label: string;
  value: number;
};

const options: AttitudeOption[] = [
  { label: "无 +0", value: 0 },
  { label: "一般 +2", value: 2 },
  { label: "好 +5", value: 5 },
  { label: "很好 +10", value: 10 },
];

const selectedValue = ref(0);
const submitting = ref(false);

const selectAttitude = async (value: number) => {
  if (submitting.value) return;
  if (!Number.isInteger(value) || value < 0) {
    ElMessage.warning("态度分必须是非负整数");
    return;
  }
  const prev = selectedValue.value;
  selectedValue.value = value;
  submitting.value = true;
  try {
    await updateAttitudePoints({
      recordDate: dayjs().format("YYYY-MM-DD"),
      attitudePoints: value,
    });
    await g.update();
    ElMessage.success(`态度分已更新：${value}`);
  } catch {
    selectedValue.value = prev;
    ElMessage.error("态度分更新失败，请稍后重试");
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  const first = await getTodayDailyPoints();
  if (first && Number(first.attitudePoints || 0) > 0) {
    selectedValue.value = Number(first.attitudePoints || 0);
  }
});
</script>

<template>
  <section class="attitude-card">
    <div class="attitude-head">
      <h3>今日态度</h3>
      <span class="attitude-value">当前：{{ selectedValue }}</span>
    </div>
    <div class="attitude-options">
      <button
        v-for="item in options"
        :key="item.value"
        type="button"
        :class="['attitude-btn', { active: selectedValue === item.value }]"
        :disabled="submitting"
        @click="selectAttitude(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </section>
</template>

<style scoped lang="less">
.attitude-card {
  width: 100%;
  max-width: 680px;
  margin: 20px auto 0;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.54),
    rgba(255, 255, 255, 0.36)
  );
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(126%);
  -webkit-backdrop-filter: blur(14px) saturate(126%);
  box-shadow: 0 12px 28px rgba(63, 102, 138, 0.14);
}

.attitude-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 22px;
    color: #335f88;
  }
}

.attitude-value {
  font-size: 13px;
  font-weight: 700;
  color: #43688d;
}

.attitude-options {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.attitude-btn {
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 800;
  color: #48678b;
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
  transition: all 0.2s ease;
}

.attitude-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(73, 136, 188, 0.18);
}

.attitude-btn.active {
  border-color: transparent;
  color: #fff;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  box-shadow: 0 10px 18px color-mix(in srgb, var(--sub-accent) 34%, transparent);
}

.attitude-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .attitude-card {
    margin-top: 16px;
    border-radius: 18px;
  }

  .attitude-head h3 {
    font-size: 20px;
  }

  .attitude-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
