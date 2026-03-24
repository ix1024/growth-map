<script setup lang="ts">
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
const addValue = ref(1);
const consumeRemark = ref("");
const consumeSubmitting = ref(false);
const showExtraDialog = ref(false);
const extraPointsValue = ref(1);
const extraRemark = ref("");
const extraSubmitting = ref(false);
const extraQuickOptions = [
  { label: "不挑食", points: 5, remark: "不挑食" },
  { label: "喝汤", points: 5, remark: "喝汤" },
  { label: "打扫卫生", points: 5, remark: "打扫卫生" },
  { label: "做家务", points: 5, remark: "做家务" },
  { label: "普通运行", points: 5, remark: "普通运行" },
  { label: "出汗运行", points: 10, remark: "出汗运行" },
] as const;

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
  applyTheme(g.theme);
});

watchEffect(() => {
  document.title = pageTitle.value;
});

const handleOpenAddDialog = () => {
  showAddDialog.value = true;
};

const handleCancelAdd = () => {
  showAddDialog.value = false;
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
};

const handleCancelExtra = () => {
  showExtraDialog.value = false;
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
        <el-input-number
          v-model="addValue"
          :min="1"
          :max="1000"
          :step="1"
          controls-position="right"
          size="large"
        />
        <el-input
          v-model="consumeRemark"
          maxlength="80"
          show-word-limit
          clearable
          placeholder="备注（必填）"
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
            v-for="option in extraQuickOptions"
            :key="option.label"
            type="button"
            :class="[
              'extra-quick-btn',
              {
                active:
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
        />
        <el-input
          v-model="extraRemark"
          maxlength="80"
          show-word-limit
          clearable
          placeholder="备注（必填）"
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

  :deep(.add-dialog .el-dialog) {
    width: calc(100% - 20px) !important;
    margin: 0 auto;
    border-radius: 18px;
  }

  :deep(.add-dialog .el-dialog__title) {
    font-size: 20px;
  }
}
</style>
