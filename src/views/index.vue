<script setup lang="ts">
import confetti from "canvas-confetti";
import dayjs from "dayjs";

import User from "@/components/User.vue";
import TodoBoard from "@/components/TodoBoard.vue";
import AttitudeBoard from "@/components/AttitudeBoard.vue";
import Week from "@/components/Week.vue";
import Month from "@/components/Month.vue";
import LevelMap from "@/components/LevelMap.vue";
import CoolLoading from "@/components/CoolLoading.vue";
import LoginPanel from "@/components/LoginPanel.vue";
import PetBuddy from "@/components/PetBuddy.vue";
import { isRequestLoading } from "@/stores/requestLoading";
import { ElMessage } from "element-plus";
import { useGStore } from "@/stores/global";
import { createExtraPoints } from "@/api/extraPoints";
import { createDailyDraw, getTodayDailyPoints } from "@/api/dailyPoints";
import { createPointsConsumption } from "@/api/pointsConsumptions";
import { setTheme } from "@/api/auth";
export type KidTheme = "candy" | "ocean" | "rainbow" | "eggparty";
const g = useGStore();
const themeOptions: Array<{ label: string; value: KidTheme }> = [
  { label: "糖果风", value: "candy" },
  { label: "海洋风", value: "ocean" },
  { label: "彩虹风", value: "rainbow" },
  { label: "蛋仔派对", value: "eggparty" },
];
const showAddDialog = ref(false);
const addValue = ref<number | undefined>(undefined);
const consumeRemark = ref("");
const consumeSubmitting = ref(false);
const consumeMode = ref<"custom" | "quick">("custom");
const consumeQuickOptions = [
  { label: "看电视", points: 100 },
  { label: "看电视", points: 200 },
  { label: "看电视", points: 300 },
  { label: "看电视", points: 400 },
  { label: "看电视", points: 500 },
  { label: "看电视", points: 600 },
  { label: "玩手机", points: 200 },
] as const;
const showExtraDialog = ref(false);
const extraPointsValue = ref<number | undefined>(undefined);
const extraRemark = ref("");
const extraSubmitting = ref(false);
const extraMode = ref<"custom" | "quick">("custom");
const extraQuickOptions = [
  { label: "不挑食", points: 5, remark: "不挑食" },
  { label: "喝汤", points: 5, remark: "喝汤" },
  { label: "打扫卫生", points: 5, remark: "打扫卫生" },
  { label: "做家务", points: 5, remark: "做家务" },
  { label: "普通运行", points: 5, remark: "普通运行" },
  { label: "出汗运行", points: 10, remark: "出汗运行" },
  { label: "优秀奖", points: 100, remark: "优秀奖" },
  { label: "三等奖", points: 200, remark: "三等奖" },
  { label: "二等奖", points: 300, remark: "二等奖" },
  { label: "一等奖", points: 500, remark: "一等奖" },
  { label: "特等奖", points: 800, remark: "特等奖" },
] as const;
const lotteryPrizes = [
  { label: "未中奖", icon: "☁️", points: 0, weight: 25, color: "#9aa6bd" },
  { label: "1积分", icon: "🌱", points: 1, weight: 25, color: "#43dd9a" },
  { label: "2积分", icon: "🍀", points: 2, weight: 17, color: "#2fd2c6" },
  { label: "5积分", icon: "⭐", points: 5, weight: 13, color: "#28c7ff" },
  { label: "10积分", icon: "⚡", points: 10, weight: 9, color: "#7c6cff" },
  { label: "50积分", icon: "💎", points: 50, weight: 5, color: "#ff6fb7" },
  { label: "100积分", icon: "🏆", points: 100, weight: 5, color: "#ff8a57" },
  { label: "1000积分", icon: "👑", points: 1000, weight: 1, color: "#ffbf47" },
] as const;
const showLotteryDialog = ref(false);
const lotteryRunning = ref(false);
const lotteryResult = ref<(typeof lotteryPrizes)[number] | null>(null);
const lotteryDrawInfo = ref<{
  drawCount: number;
  maxDrawCount: number;
  cost: number;
  remainingDrawCount: number;
} | null>(null);
const lotteryTodayDrawCount = ref(0);
const lotteryMaxDrawCount = 10;
const lotteryRuleLoading = ref(false);
const wheelRotation = ref(0);
let lotteryTimer: ReturnType<typeof window.setTimeout> | null = null;

const pageTitle = computed(() => {
  const name = g.userInfo?.nickname?.trim();
  if (name) return `${name}的成长地图`;
  return "少年成长地图";
});

const todayCompletionRate = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  const todayBucket = g.monthlyPoints[today];
  return todayBucket ? Math.min(todayBucket.points, 100) : 0;
});

const wheelBackground = computed(() => {
  const segment = 360 / lotteryPrizes.length;
  return lotteryPrizes
    .map((item, index) => {
      const start = index * segment;
      const end = (index + 1) * segment;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(", ");
});

const pickLotteryPrizeIndex = () => {
  const totalWeight = lotteryPrizes.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (let index = 0; index < lotteryPrizes.length; index += 1) {
    random -= lotteryPrizes[index].weight;
    if (random < 0) return index;
  }
  return lotteryPrizes.length - 1;
};

const getLotteryDrawCost = (nextDrawCount: number) => {
  if (nextDrawCount <= 3) return 0;
  if (nextDrawCount <= 6) return 1;
  if (nextDrawCount <= 9) return 3;
  return 10;
};

const getLotteryConsumedPoints = (drawCount: number) => {
  const count = Math.max(0, Math.floor(Number(drawCount) || 0));
  if (count <= 3) return 0;
  if (count <= 6) return count - 3;
  if (count <= 9) return 3 + (count - 6) * 3;
  return 22;
};

const nextLotteryDrawCount = computed(() => lotteryTodayDrawCount.value + 1);

const nextLotteryCost = computed(() => {
  return getLotteryDrawCost(nextLotteryDrawCount.value);
});

const todayLotteryEarnedPoints = computed(() => {
  const today = dayjs().format("YYYY-MM-DD");
  return g.extraPointsList.reduce((sum, item) => {
    const createdDate = dayjs(item.createdAt).format("YYYY-MM-DD");
    const remark = String(item.remark || "");
    if (createdDate !== today || !remark.startsWith("抽奖奖励")) {
      return sum;
    }
    return sum + Number(item.points || 0);
  }, 0);
});

const todayLotteryConsumedPoints = computed(() => {
  return getLotteryConsumedPoints(lotteryTodayDrawCount.value);
});

const lotteryUnavailable = computed(() => {
  return lotteryTodayDrawCount.value >= lotteryMaxDrawCount;
});

const lotteryRuleText = computed(() => {
  if (lotteryRuleLoading.value) return "正在查询今日抽奖次数";
  if (lotteryUnavailable.value) return "今日抽奖次数已用完";
  const cost = nextLotteryCost.value;
  if (cost <= 0) {
    return `今日已抽 ${lotteryTodayDrawCount.value} 次，本次免费`;
  }
  return `今日已抽 ${lotteryTodayDrawCount.value} 次，本次消耗 ${cost} 积分`;
});

const nextLotteryCostText = computed(() => {
  if (lotteryUnavailable.value) return "今日抽奖次数已用完";
  const cost = nextLotteryCost.value;
  return cost > 0 ? `下次消耗 ${cost} 积分` : "下次免费";
});

const lotteryActionText = computed(() => {
  if (lotteryRunning.value) return "抽奖中";
  if (lotteryUnavailable.value) return "今日已抽完";
  const cost = nextLotteryCost.value;
  if (cost <= 0) return lotteryResult.value ? "再抽一次 免费" : "免费抽奖";
  return `${lotteryResult.value ? "再抽一次" : "立即抽奖"} -${cost}`;
});

const refreshLotteryRule = async () => {
  lotteryRuleLoading.value = true;
  try {
    const todayRecord = await getTodayDailyPoints();
    lotteryTodayDrawCount.value = Number(todayRecord?.drawCount || 0);
  } catch {
    lotteryTodayDrawCount.value = 0;
  } finally {
    lotteryRuleLoading.value = false;
  }
};

const applyTheme = (theme: KidTheme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

const handleThemeChange = async (theme: KidTheme) => {
  applyTheme(theme);
  g.theme = theme;
  setTheme(theme);
};

const handleLoginSuccess = async () => {
  await g.checkAuthStatus();
};

onMounted(async () => {
  await g.checkAuthStatus();
});

onUnmounted(() => {
  if (lotteryTimer) {
    window.clearTimeout(lotteryTimer);
  }
});

watch(
  () => g.theme,
  (theme) => {
    applyTheme(theme);
  },
  { immediate: true },
);

watchEffect(() => {
  document.title = pageTitle.value;
});

const handleOpenAddDialog = () => {
  showAddDialog.value = true;
  consumeMode.value = "custom";
  addValue.value = undefined;
  consumeRemark.value = "";
};

const handleCancelAdd = () => {
  showAddDialog.value = false;
};

const applyConsumeCustomOption = () => {
  consumeMode.value = "custom";
  addValue.value = undefined;
  consumeRemark.value = "";
};

const applyConsumeQuickOption = (
  option: (typeof consumeQuickOptions)[number],
) => {
  consumeMode.value = "quick";
  addValue.value = option.points;
  consumeRemark.value = option.label;
};

const handleConfirmAdd = async () => {
  try {
    const value = Number(addValue.value);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      ElMessage.warning("消耗积分必须是正整数");
      return;
    }
    if (!consumeRemark.value) {
      return ElMessage.warning("备注必填");
    }
    consumeSubmitting.value = true;
    await createPointsConsumption({
      consumedPoints: value,
      remark: consumeRemark.value,
    });
    ElMessage.success(`已消耗：${value} 积分`);
    showAddDialog.value = false;
    consumeRemark.value = "";
    await g.update();
  } catch {
    ElMessage.error("提交失败，请稍后重试");
  } finally {
    consumeSubmitting.value = false;

    consumeRemark.value = "";
  }
};

const handleOpenExtraDialog = () => {
  showExtraDialog.value = true;
  extraMode.value = "custom";
  extraPointsValue.value = undefined;
  extraRemark.value = "";
};

const handleOpenLotteryDialog = async () => {
  showLotteryDialog.value = true;
  lotteryResult.value = null;
  lotteryDrawInfo.value = null;
  await refreshLotteryRule();
};

const fireLotteryConfetti = () => {
  confetti({
    particleCount: 90,
    spread: 80,
    origin: { y: 0.58 },
    colors: ["#ff7b37", "#ff5ca8", "#28c7ff", "#43dd9a", "#ffd166"],
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.65 },
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.65 },
    });
  }, 220);
};

const handleStartLottery = async () => {
  if (lotteryRunning.value || lotteryUnavailable.value) return;

  lotteryRunning.value = true;
  lotteryResult.value = null;
  lotteryDrawInfo.value = null;

  let drawPayload: Awaited<ReturnType<typeof createDailyDraw>>;
  try {
    drawPayload = await createDailyDraw();
    lotteryDrawInfo.value = {
      drawCount: Number(drawPayload.drawCount || 0),
      maxDrawCount: Number(drawPayload.maxDrawCount || 10),
      cost: Number(drawPayload.cost || 0),
      remainingDrawCount: Number(drawPayload.remainingDrawCount || 0),
    };
    lotteryTodayDrawCount.value = lotteryDrawInfo.value.drawCount;
  } catch {
    lotteryRunning.value = false;
    await refreshLotteryRule();
    return;
  }

  const prizeIndex = pickLotteryPrizeIndex();
  const segment = 360 / lotteryPrizes.length;
  const targetAngle = 360 - (prizeIndex * segment + segment / 2);
  const currentBase = wheelRotation.value % 360;
  wheelRotation.value = wheelRotation.value + 360 * 7 + targetAngle - currentBase;

  lotteryTimer = window.setTimeout(async () => {
    const prize = lotteryPrizes[prizeIndex];
    lotteryResult.value = prize;
    lotteryRunning.value = false;

    if (prize.points > 0) {
      try {
        await createExtraPoints({
          points: prize.points,
          remark: `抽奖奖励：${prize.label}`,
        });
        fireLotteryConfetti();
        ElMessage.success(`抽中 ${prize.label}，奖励 ${prize.points} 积分`);
        await g.update();
      } catch {
        ElMessage.error("抽奖结果保存失败，请稍后重试");
        await g.update();
      }
    } else {
      ElMessage.info("很遗憾，本次未中奖");
      await g.update();
    }
  }, 3600);
};

const handleCancelExtra = () => {
  showExtraDialog.value = false;
  extraRemark.value = "";
};

const applyExtraCustomOption = () => {
  extraMode.value = "custom";
  extraPointsValue.value = undefined;
  extraRemark.value = "";
};

const handleConfirmExtra = async () => {
  const value = Number(extraPointsValue.value);
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    ElMessage.warning("奖励积分必须是正整数");
    return;
  }
  if (!extraRemark.value.trim()) {
    ElMessage.warning("备注为必填项");
    return;
  }
  extraSubmitting.value = true;
  try {
    await createExtraPoints({
      points: value,
      remark: extraRemark.value.trim(),
    });
    ElMessage.success(`已添加奖励积分：${value}`);
    showExtraDialog.value = false;
    extraRemark.value = "";
    await g.update();
  } catch {
    ElMessage.error("添加奖励积分失败，请稍后重试");
  } finally {
    extraSubmitting.value = false;
  }
};

const applyExtraQuickOption = (option: (typeof extraQuickOptions)[number]) => {
  extraMode.value = "quick";
  extraPointsValue.value = option.points;
  extraRemark.value = option.remark;
};
</script>
<template>
  <CoolLoading v-if="isRequestLoading" />
  <main class="page">
    <aside class="theme-switcher">
      <div class="theme-title">主题</div>
      <button
        v-for="item in themeOptions"
        :key="item.value"
        type="button"
        :class="['theme-btn', { active: g.theme === item.value }]"
        @click="handleThemeChange(item.value)"
      >
        {{ item.label }}
      </button>
    </aside>

    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <section class="content">
      <header class="page-header">
        <h1>{{ pageTitle }}</h1>
      </header>
      <User />
      <TodoBoard />
      <AttitudeBoard />
      <Week />
      <Month />
      <LevelMap />
    </section>

    <button class="floating-add-btn" type="button" @click="handleOpenAddDialog">
      <span class="floating-add-icon">-</span>
      <span class="floating-add-text">消耗</span>
    </button>

    <button
      class="floating-extra-btn"
      type="button"
      @click="handleOpenExtraDialog"
    >
      <span class="floating-extra-icon">+</span>
      <span class="floating-extra-text">奖励</span>
    </button>

    <button
      class="floating-lottery-btn"
      type="button"
      @click="handleOpenLotteryDialog"
    >
      <span class="floating-lottery-icon">★</span>
      <span class="floating-lottery-text">抽奖</span>
    </button>

    <!-- <button
        class="floating-system-btn"
        type="button"
        @click="handleOpenSystemDrawer"
      >
        <span class="floating-system-icon">⚙</span>
        <span class="floating-system-text">配置</span>
      </button> -->

    <el-dialog
      v-model="showAddDialog"
      title="消耗积分"
      width="420"
      align-center
      class="add-dialog"
    >
      <div class="add-dialog-body add-dialog-body-extra">
        <div class="extra-quick-grid">
          <button
            type="button"
            :class="['extra-quick-btn', { active: consumeMode === 'custom' }]"
            @click="applyConsumeCustomOption"
          >
            自定义
          </button>
          <button
            v-for="option in consumeQuickOptions"
            :key="`${option.label}-${option.points}`"
            type="button"
            :class="[
              'extra-quick-btn',
              {
                disabled: consumeMode === 'quick' && addValue !== option.points,
                active:
                  consumeMode === 'quick' &&
                  addValue === option.points &&
                  consumeRemark.trim() === option.label,
              },
            ]"
            @click="applyConsumeQuickOption(option)"
          >
            {{ option.label }} -{{ option.points }}
          </button>
        </div>
        <el-input-number
          v-model="addValue"
          :min="1"
          :max="1000"
          :step="1"
          controls-position="right"
          size="large"
          placeholder="请输入消耗积分"
          :disabled="consumeMode === 'quick'"
        />
        <el-input
          v-model="consumeRemark"
          maxlength="80"
          show-word-limit
          clearable
          placeholder="备注（必填）"
          :disabled="consumeMode === 'quick'"
        />
      </div>
      <div class="add-dialog-footer">
        <el-button class="btn-cancel" @click="handleCancelAdd">取消</el-button>
        <el-button
          class="btn-confirm"
          type="primary"
          :loading="consumeSubmitting"
          @click="handleConfirmAdd"
        >
          确认消耗
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showExtraDialog"
      title="添加奖励积分"
      width="420"
      align-center
      class="add-dialog"
    >
      <div class="add-dialog-body add-dialog-body-extra">
        <div class="extra-quick-grid">
          <button
            type="button"
            :class="['extra-quick-btn', { active: extraMode === 'custom' }]"
            @click="applyExtraCustomOption"
          >
            自定义
          </button>
          <button
            v-for="option in extraQuickOptions"
            :key="`${option.label}-${option.points}`"
            type="button"
            :class="[
              'extra-quick-btn',
              {
                disabled: extraMode === 'quick' && extraPointsValue !== option.points,
                active:
                  extraMode === 'quick' &&
                  extraPointsValue === option.points &&
                  extraRemark.trim() === option.remark,
              },
            ]"
            @click="applyExtraQuickOption(option)"
          >
            {{ option.label }} +{{ option.points }}
          </button>
        </div>
        <el-input-number
          v-model="extraPointsValue"
          :min="1"
          :max="1000"
          :step="1"
          controls-position="right"
          size="large"
          placeholder="请输入奖励积分"
          :disabled="extraMode === 'quick'"
        />
        <el-input
          v-model="extraRemark"
          maxlength="80"
          show-word-limit
          clearable
          placeholder="备注（必填）"
          :disabled="extraMode === 'quick'"
        />
      </div>
      <div class="add-dialog-footer">
        <el-button class="btn-cancel" @click="handleCancelExtra"
          >取消</el-button
        >
        <el-button
          class="btn-confirm"
          type="primary"
          :loading="extraSubmitting"
          @click="handleConfirmExtra"
        >
          确认添加
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showLotteryDialog"
      title="幸运抽奖"
      width="480"
      :z-index="10060"
      align-center
      class="lottery-dialog"
    >
      <div class="lottery-stage" :class="{ running: lotteryRunning }">
        <div class="lottery-aurora"></div>
        <div class="lottery-pointer"></div>
        <div
          class="lottery-wheel"
          :style="{
            '--wheel-bg': wheelBackground,
            transform: `rotate(${wheelRotation}deg)`,
          }"
        >
          <div
            v-for="(prize, index) in lotteryPrizes"
            :key="prize.label"
            class="lottery-prize"
          >
            <span
              :style="{
                transform: `translate(-50%, -50%) rotate(${index * (360 / lotteryPrizes.length) + 360 / lotteryPrizes.length / 2}deg) translateY(-92px) rotate(-${wheelRotation + index * (360 / lotteryPrizes.length) + 360 / lotteryPrizes.length / 2}deg)`,
              }"
            >
              <b>{{ prize.icon }}</b>
              <em>{{ prize.points > 0 ? prize.points : "未中" }}</em>
            </span>
          </div>
          <div
            class="lottery-core"
            :style="{ transform: `translate(-50%, -50%) rotate(${-wheelRotation}deg)` }"
          >
            <span>LUCKY</span>
          </div>
        </div>
        <div class="lottery-ring"></div>
      </div>
      <div class="lottery-result" :class="{ visible: lotteryResult }">
        <template v-if="lotteryResult">
          <template v-if="lotteryResult.points > 0">
            <span>{{ lotteryResult.points }}积分</span>
          </template>
          <template v-else>
            <span>未中奖</span>
            <strong>谢谢参与</strong>
          </template>
          <small v-if="lotteryDrawInfo">
            {{
              lotteryDrawInfo.cost > 0
                ? `本次消耗 ${lotteryDrawInfo.cost} 积分`
                : "本次免费"
            }}，今日已抽 {{ lotteryDrawInfo.drawCount }} 次；{{
              nextLotteryCostText
            }}
          </small>
        </template>
        <template v-else>{{ lotteryRuleText }}</template>
      </div>
      <div class="lottery-actions">
        <el-button
          class="lottery-start-btn"
          type="primary"
          :disabled="lotteryUnavailable || lotteryRuleLoading"
          :loading="lotteryRunning"
          @click="handleStartLottery"
        >
          {{ lotteryActionText }}
        </el-button>
      </div>
      <div class="lottery-summary">
        今日抽奖已获得 {{ todayLotteryEarnedPoints }} 积分，已消耗
        {{ todayLotteryConsumedPoints }} 积分
      </div>
    </el-dialog>

    <!-- <el-drawer
        v-model="showSystemDrawer"
        title="系统配置"
        direction="rtl"
        size="380px"
        class="system-drawer"
      >
        <section class="drawer-section">
          <h4>待办事项显示</h4>
          <p>勾选后，事项才会在首页“今日待办”中展示。</p>
          <div class="drawer-add-box">
            <el-input
              v-model="customTodoTitle"
              placeholder="输入自定义待办事项"
              clearable
              @keyup.enter="handleAddCustomTodo"
            />
            <el-button
              type="primary"
              class="drawer-add-btn"
              @click="handleAddCustomTodo"
            >
              添加事项
            </el-button>
          </div>
          <div class="drawer-todo-list">
            <label
              v-for="item in todoState.items"
              :key="item.id"
              class="drawer-todo-item"
            >
              <div class="drawer-left">
                <el-checkbox v-model="item.enabled" size="large" />
                <span>{{ item.title }}</span>
              </div>
              <el-button
                v-if="!item.builtIn"
                type="danger"
                link
                class="drawer-delete-btn"
                @click="handleDeleteCustomTodo(item.id)"
              >
                删除
              </el-button>
            </label>
          </div>
        </section>
      </el-drawer> -->
    <PetBuddy :completion-rate="todayCompletionRate" />
  </main>
</template>
<style scoped lang="less">
.auth-loading {
  min-height: 100vh;
}

.page {
  position: relative;
  width: 100%;
  padding: 24px 16px 40px;
  overflow: hidden;
}

.theme-switcher {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 10px 28px rgba(31, 41, 55, 0.14);
}

.theme-title {
  font-size: 13px;
  color: #5e5c88;
  font-weight: 700;
  padding: 0 6px;
}

.theme-btn {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #6a6699;
  background: #f4f3ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-btn.active {
  color: #fff;
  background: linear-gradient(90deg, #ff8d57, #ff58c2);
  box-shadow: 0 6px 14px rgba(255, 91, 169, 0.28);
}

.content {
  position: relative;
  z-index: 2;
}

.page-header {
  width: 100%;
  max-width: 680px;
  margin: 0 auto 14px;
  text-align: center;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
  letter-spacing: 1px;
  color: transparent;
  background: linear-gradient(
    90deg,
    var(--main-accent),
    var(--sub-accent) 52%,
    #00a4ff
  );
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: 0 8px 20px rgba(56, 35, 102, 0.12);
}

.orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(1px);
  animation: float 7s ease-in-out infinite;
}

.orb-1 {
  width: 160px;
  height: 160px;
  top: -40px;
  right: 5%;
  background: var(--orb-1);
}

.orb-2 {
  width: 120px;
  height: 120px;
  top: 32%;
  left: -40px;
  background: var(--orb-2);
  animation-delay: 1.4s;
}

.orb-3 {
  width: 140px;
  height: 140px;
  bottom: 10%;
  right: -30px;
  background: var(--orb-3);
  animation-delay: 2.3s;
}

.floating-add-btn {
  position: fixed;
  right: 18px;
  bottom: 20px;
  z-index: 10020;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--main-accent) 84%, #ffffff),
      color-mix(in srgb, var(--sub-accent) 90%, #ffffff)
    ),
    rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow:
    0 12px 26px color-mix(in srgb, var(--sub-accent) 35%, transparent),
    inset 0 0 0 1px rgba(255, 255, 255, 0.24);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.floating-add-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 16px 30px color-mix(in srgb, var(--sub-accent) 45%, transparent),
    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}

.floating-add-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  background: rgba(255, 255, 255, 0.25);
}

.floating-add-text {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.floating-system-btn {
  position: fixed;
  right: 18px;
  bottom: 86px;
  z-index: 12;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sub-accent) 76%, #ffffff),
      color-mix(in srgb, var(--main-accent) 82%, #ffffff)
    ),
    rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow:
    0 10px 22px color-mix(in srgb, var(--main-accent) 32%, transparent),
    inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}

.floating-system-btn:hover {
  transform: translateY(-2px) scale(1.02);
}

.floating-system-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 15px;
  background: rgba(255, 255, 255, 0.26);
}

.floating-system-text {
  font-size: 14px;
  font-weight: 800;
}

.floating-extra-btn {
  position: fixed;
  right: 18px;
  bottom: 82px;
  z-index: 10020;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, #4bc9ff 82%, #ffffff),
      color-mix(in srgb, #38e0a8 90%, #ffffff)
    ),
    rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow:
    0 10px 22px rgba(56, 196, 219, 0.32),
    inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}

.floating-extra-btn:hover {
  transform: translateY(-2px) scale(1.02);
}

.floating-extra-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  background: rgba(255, 255, 255, 0.26);
}

.floating-extra-text {
  font-size: 14px;
  font-weight: 800;
}

.floating-lottery-btn {
  position: fixed;
  right: 18px;
  bottom: 144px;
  z-index: 10020;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background:
    linear-gradient(135deg, #7c6cff, #ff5ca8 48%, #ffbf47),
    rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  box-shadow:
    0 12px 28px rgba(124, 108, 255, 0.34),
    0 0 24px rgba(255, 92, 168, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  animation: lotteryButtonPulse 1.8s ease-in-out infinite;
}

.floating-lottery-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    0 16px 34px rgba(124, 108, 255, 0.42),
    0 0 30px rgba(255, 92, 168, 0.36),
    inset 0 0 0 1px rgba(255, 255, 255, 0.36);
}

.floating-lottery-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  color: #fff7c8;
  background: rgba(255, 255, 255, 0.28);
  text-shadow: 0 0 10px rgba(255, 247, 200, 0.9);
}

.floating-lottery-text {
  font-size: 14px;
  font-weight: 900;
}

.lottery-stage {
  position: relative;
  width: min(280px, 70vw);
  height: min(280px, 70vw);
  margin: 2px auto 14px;
  display: grid;
  place-items: center;
  isolation: isolate;
}

.lottery-aurora {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg, #ffbf47, #ff5ca8, #7c6cff, #28c7ff, #43dd9a, #ffbf47);
  filter: blur(18px);
  opacity: 0.66;
  animation: auroraSpin 3.6s linear infinite;
}

.lottery-pointer {
  position: absolute;
  top: 0;
  z-index: 4;
  width: 0;
  height: 0;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
  border-top: 30px solid #fff;
  filter: drop-shadow(0 8px 10px rgba(55, 44, 105, 0.26));
}

.lottery-wheel {
  position: relative;
  z-index: 2;
  width: 88%;
  height: 88%;
  border-radius: 50%;
  background: conic-gradient(var(--wheel-bg));
  border: 8px solid rgba(255, 255, 255, 0.92);
  box-shadow:
    0 18px 34px rgba(49, 57, 103, 0.22),
    0 0 0 6px rgba(255, 255, 255, 0.28),
    inset 0 0 24px rgba(255, 255, 255, 0.32);
  transition: transform 3.6s cubic-bezier(0.12, 0.82, 0.14, 1);
  overflow: hidden;
}

.lottery-wheel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.34), transparent 22%),
    repeating-conic-gradient(
      from 0deg,
      rgba(255, 255, 255, 0.24) 0deg 1deg,
      transparent 1deg 60deg
    );
  pointer-events: none;
}

.lottery-stage.running .lottery-wheel {
  box-shadow:
    0 22px 46px rgba(49, 57, 103, 0.32),
    0 0 0 8px rgba(255, 255, 255, 0.32),
    0 0 42px rgba(255, 92, 168, 0.36),
    inset 0 0 34px rgba(255, 255, 255, 0.46);
}

.lottery-prize {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.lottery-prize span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 54px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: #fff;
  font-weight: 900;
  text-align: center;
  text-shadow:
    0 1px 3px rgba(31, 38, 74, 0.42),
    0 0 8px rgba(255, 255, 255, 0.32);
  white-space: nowrap;
}

.lottery-prize b {
  display: block;
  font-size: 18px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(31, 38, 74, 0.24));
}

.lottery-prize em {
  display: block;
  font-size: 12px;
  font-style: normal;
  line-height: 1;
}

.lottery-core {
  position: absolute;
  inset: 50%;
  z-index: 3;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.9), transparent 19%),
    linear-gradient(135deg, var(--main-accent), var(--sub-accent));
  box-shadow:
    0 10px 20px rgba(53, 48, 101, 0.24),
    inset 0 0 0 4px rgba(255, 255, 255, 0.35);
}

.lottery-core span {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.lottery-ring {
  position: absolute;
  inset: 8%;
  z-index: 1;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.76);
  animation: ringSpin 8s linear infinite reverse;
}

.lottery-result {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #536184;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.lottery-result.visible span {
  color: #2f4676;
  font-size: 24px;
  font-weight: 900;
  line-height: 1.15;
}

.lottery-result.visible strong {
  color: var(--sub-accent);
  font-size: 18px;
  font-weight: 900;
  line-height: 1.15;
}

.lottery-result small {
  color: #6d7899;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.lottery-summary {
  margin-top: 10px;
  color: rgba(83, 94, 128, 0.5);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
}

.lottery-actions {
  display: flex;
  justify-content: center;
  padding: 6px 0 2px;
}

:deep(.lottery-dialog .el-dialog) {
  max-width: calc(100vw - 24px);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.76);
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.86), transparent 44%),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--main-accent) 17%, #fff),
      color-mix(in srgb, var(--sub-accent) 18%, #fff)
    );
  box-shadow: 0 22px 48px rgba(49, 57, 103, 0.28);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
}

:deep(.lottery-dialog .el-dialog__header) {
  padding: 18px 22px 0;
  margin-right: 0;
}

:deep(.lottery-dialog .el-dialog__title) {
  display: block;
  font-size: 24px;
  font-weight: 900;
  text-align: center;
  color: transparent;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent), #28c7ff);
  -webkit-background-clip: text;
  background-clip: text;
}

:deep(.lottery-dialog .el-dialog__body) {
  padding: 10px 22px 22px;
}

:deep(.lottery-start-btn.el-button) {
  min-width: 180px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 900;
  background: linear-gradient(90deg, #7c6cff, var(--sub-accent), var(--main-accent));
  box-shadow:
    0 12px 22px rgba(255, 92, 168, 0.32),
    0 0 20px rgba(124, 108, 255, 0.24);
}

:deep(.lottery-start-btn.el-button:hover) {
  transform: translateY(-1px);
  opacity: 0.96;
}

.add-dialog-body {
  display: flex;
  justify-content: center;
  padding: 8px 0 14px;
}

.add-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.add-dialog-body-extra {
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.extra-quick-grid {
  width: 100%;
  max-width: 280px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.extra-quick-btn {
  border: 1px solid rgba(115, 189, 222, 0.72);
  background:
    linear-gradient(
      150deg,
      rgba(255, 255, 255, 0.9),
      rgba(231, 249, 255, 0.72)
    ),
    radial-gradient(
      circle at top right,
      rgba(120, 223, 255, 0.24),
      transparent 55%
    );
  color: #205f81;
  border-radius: 12px;
  padding: 9px 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.2px;
  cursor: pointer;
  box-shadow:
    0 4px 10px rgba(59, 160, 190, 0.12),
    inset 0 0 0 1px rgba(255, 255, 255, 0.55);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.extra-quick-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 14px rgba(48, 145, 174, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.62);
}

.extra-quick-btn.active {
  border-color: rgba(49, 152, 185, 0.95);
  background:
    linear-gradient(
      145deg,
      rgba(157, 236, 255, 0.92),
      rgba(128, 213, 239, 0.84)
    ),
    radial-gradient(
      circle at top right,
      rgba(255, 255, 255, 0.5),
      transparent 60%
    );
  color: #154e70;
  box-shadow:
    0 10px 16px rgba(38, 136, 164, 0.25),
    inset 0 0 0 1px rgba(255, 255, 255, 0.75);
}

@media (max-width: 420px) {
  .extra-quick-grid {
    grid-template-columns: 1fr;
  }
}

:deep(.add-dialog .el-dialog) {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.78),
      rgba(255, 255, 255, 0.58)
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--main-accent) 15%, #fff),
      color-mix(in srgb, var(--sub-accent) 16%, #fff)
    );
  box-shadow: 0 18px 38px rgba(49, 57, 103, 0.22);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
}

:deep(.add-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 16px 20px 8px;
}

:deep(.add-dialog .el-dialog__title) {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #2f4676;
}

:deep(.add-dialog .el-dialog__body) {
  padding: 8px 20px 10px;
}

:deep(.add-dialog .el-dialog__footer) {
  padding: 8px 20px 18px;
}

:deep(.add-dialog .el-input-number) {
  width: 100%;
  max-width: 280px;
}

:deep(.add-dialog .el-input) {
  width: 100%;
  max-width: 280px;
}

:deep(.add-dialog .el-input-number .el-input__wrapper) {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.86),
    0 0 0 3px color-mix(in srgb, var(--main-accent) 22%, transparent);
}

:deep(.add-dialog .el-input-number .el-input__inner) {
  font-weight: 700;
  color: #2a3f68;
  text-align: center;
}

:deep(.add-dialog .el-input .el-input__wrapper) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.86),
    0 0 0 3px color-mix(in srgb, var(--main-accent) 16%, transparent);
}

:deep(.add-dialog .btn-cancel.el-button),
:deep(.add-dialog .btn-confirm.el-button) {
  border-radius: 999px;
  padding: 9px 18px;
  font-weight: 700;
}

:deep(.add-dialog .btn-cancel.el-button) {
  border: 1px solid rgba(255, 255, 255, 0.78);
  color: #57648a;
  background: rgba(255, 255, 255, 0.68);
}

:deep(.add-dialog .btn-cancel.el-button:hover) {
  color: #32476f;
  border-color: rgba(255, 255, 255, 0.94);
}

:deep(.add-dialog .btn-confirm.el-button) {
  border: 0;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  box-shadow: 0 8px 16px color-mix(in srgb, var(--sub-accent) 32%, transparent);
}

:deep(.add-dialog .btn-confirm.el-button:hover) {
  opacity: 0.94;
  transform: translateY(-1px);
}

:deep(.system-drawer .el-drawer) {
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.82),
      rgba(255, 255, 255, 0.62)
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--main-accent) 14%, #fff),
      color-mix(in srgb, var(--sub-accent) 16%, #fff)
    );
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

:deep(.system-drawer .el-drawer__header) {
  margin-bottom: 0;
}

:deep(.system-drawer .el-drawer__title) {
  font-size: 24px;
  font-weight: 800;
  color: #324a76;
}

.drawer-section h4 {
  margin: 0;
  font-size: 17px;
  color: #3d5380;
}

.drawer-section p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #5d6a8c;
}

.drawer-todo-list {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.drawer-add-box {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.drawer-add-btn {
  border-radius: 10px;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  border: 0;
}

.drawer-todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.72);
  color: #334669;
  font-size: 14px;
  font-weight: 600;
}

.drawer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-delete-btn {
  font-weight: 700;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-14px);
  }
}

@keyframes lotteryButtonPulse {
  0%,
  100% {
    filter: saturate(1);
  }
  50% {
    filter: saturate(1.18) brightness(1.05);
  }
}

@keyframes auroraSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ringSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .page {
    padding: 16px 10px 78px;
  }

  .theme-switcher {
    top: auto;
    right: 50%;
    bottom: 12px;
    transform: translateX(50%);
    width: calc(100% - 20px);
    justify-content: space-between;
    border-radius: 14px;
  }

  .theme-title {
    display: none;
  }

  .theme-btn {
    flex: 1;
    text-align: center;
    padding: 8px 0;
  }

  .orb {
    opacity: 0.7;
  }

  .page-header {
    margin-bottom: 10px;
  }

  .floating-add-btn {
    right: 14px;
    bottom: 146px;
    height: 48px;
    padding: 0 12px 0 10px;
    gap: 6px;
  }

  .floating-add-icon {
    width: 26px;
    height: 26px;
    font-size: 20px;
  }

  .floating-add-text {
    font-size: 13px;
  }

  .floating-system-btn {
    right: 14px;
    bottom: 86px;
    height: 48px;
    padding: 0 12px 0 10px;
    gap: 6px;
  }

  .floating-extra-btn {
    right: 14px;
    bottom: 206px;
    height: 48px;
    padding: 0 12px 0 10px;
    gap: 6px;
  }

  .floating-system-icon {
    width: 26px;
    height: 26px;
  }

  .floating-system-text {
    font-size: 13px;
  }

  .floating-extra-icon {
    width: 26px;
    height: 26px;
    font-size: 18px;
  }

  .floating-extra-text {
    font-size: 13px;
  }

  .floating-lottery-btn {
    right: 14px;
    bottom: 266px;
    height: 48px;
    padding: 0 12px 0 10px;
    gap: 6px;
  }

  .floating-lottery-icon {
    width: 26px;
    height: 26px;
    font-size: 15px;
  }

  .floating-lottery-text {
    font-size: 13px;
  }

  .lottery-prize span {
    width: 66px;
    font-size: 11px;
    transform-origin: center center;
  }

  .lottery-core {
    width: 82px;
    height: 82px;
  }

  .lottery-core span {
    font-size: 13px;
  }

  :deep(.add-dialog .el-dialog) {
    width: calc(100% - 20px) !important;
    margin: 0 auto;
    border-radius: 18px;
  }

  :deep(.lottery-dialog .el-dialog) {
    width: calc(100% - 20px) !important;
    margin: 0 auto;
    border-radius: 20px;
  }

  :deep(.add-dialog .el-dialog__title) {
    font-size: 20px;
  }

  :deep(.lottery-dialog .el-dialog__title) {
    font-size: 22px;
  }
}
</style>
