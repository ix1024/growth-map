<script setup lang="ts">
import confetti from "canvas-confetti";
import dayjs from "dayjs";
import { getTodayDailyPoints, upsertDailyPoints } from "@/api/dailyPoints";
import { getTodoConfig } from "@/api/todo";
import { resolveChallengeRank } from "@/config/challenge";
import { useGStore } from "@/stores/global";

type Item = {
  id: number;
  title: string;
  completed: boolean;
};

type TodoBoardItem = {
  id: number;
  title: string;
  completed: boolean;
};
const state = reactive({
  list: [] as Item[],
  selectedIds: [] as number[],
});
const g = useGStore();
const todoTitle = "今日待办 ";
const completionRate = computed(() => {
  return Math.round((state.selectedIds?.length / state.list?.length) * 100);
});

const canQuickComplete = computed(
  () =>
    state.list?.length === state.selectedIds?.length &&
    state.selectedIds?.length > 0,
);
const todayRank = computed(() => resolveChallengeRank(completionRate.value));

const rankHint = computed(() => {
  if (completionRate.value >= 100) return "状态爆棚，今天直接封神";
  if (completionRate.value >= 80) return "保持节奏，再冲一把";
  if (completionRate.value >= 60) return "完成得不错，继续稳住";
  return "先完成最简单的一项，开个好头";
});

const showVictory = ref(false);
let victoryTimer: ReturnType<typeof setTimeout> | null = null;
let clearConfettiTimer: ReturnType<typeof setTimeout> | null = null;
const confettiBurstTimers: Array<ReturnType<typeof setTimeout>> = [];
let confettiCanvas: HTMLCanvasElement | null = null;
let confettiCleanup: (() => void) | null = null;

const playCompleteSound = () => {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      880,
      audioContext.currentTime + 0.12,
    );
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.2,
      audioContext.currentTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.2,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch {
    // Ignore sound errors on unsupported devices.
  }
};

const playVictorySound = () => {
  try {
    const audio = new Audio("/freesound_community-goodresult-82807.mp3");
    audio.volume = 0.9;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Ignore sound errors on unsupported devices.
  }
};

const clearConfettiBursts = () => {
  confettiBurstTimers.forEach((timer) => clearTimeout(timer));
  confettiBurstTimers.length = 0;
};

const scheduleConfetti = (delay: number, callback: () => void) => {
  const timer = setTimeout(() => {
    callback();
  }, delay);
  confettiBurstTimers.push(timer);
};

const launchFullscreenConfetti = () => {
  if (!confettiCanvas) {
    confettiCanvas = document.createElement("canvas");
    confettiCanvas.style.position = "fixed";
    confettiCanvas.style.inset = "0";
    confettiCanvas.style.width = "100vw";
    confettiCanvas.style.height = "100vh";
    confettiCanvas.style.pointerEvents = "none";
    confettiCanvas.style.zIndex = "1000";
    document.body.appendChild(confettiCanvas);
  }

  const fire = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true,
  });
  clearConfettiBursts();

  const presets = [
    () => {
      fire({
        particleCount: 180,
        spread: 120,
        startVelocity: 52,
        origin: { x: 0.5, y: 0.62 },
        scalar: 1.1,
      });
      scheduleConfetti(120, () =>
        fire({
          particleCount: 120,
          spread: 95,
          startVelocity: 45,
          origin: { x: 0.16, y: 0.58 },
        }),
      );
      scheduleConfetti(220, () =>
        fire({
          particleCount: 120,
          spread: 95,
          startVelocity: 45,
          origin: { x: 0.84, y: 0.58 },
        }),
      );
    },
    () => {
      fire({
        particleCount: 90,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.72 },
      });
      fire({
        particleCount: 90,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.72 },
      });
      scheduleConfetti(240, () =>
        fire({
          particleCount: 120,
          spread: 110,
          origin: { x: 0.5, y: 0.58 },
          gravity: 0.9,
        }),
      );
    },
    () => {
      for (let i = 0; i < 8; i += 1) {
        scheduleConfetti(i * 120, () => {
          fire({
            particleCount: 44,
            spread: 60,
            startVelocity: 28,
            ticks: 180,
            origin: { x: Math.random(), y: Math.random() * 0.25 + 0.1 },
          });
        });
      }
    },
    () => {
      const colors = ["#ffd54f", "#ffb300", "#ff8f00", "#ffe082"];
      fire({
        particleCount: 90,
        spread: 80,
        origin: { x: 0.5, y: 0.65 },
        colors,
        scalar: 1.2,
      });
      scheduleConfetti(120, () =>
        fire({
          particleCount: 60,
          spread: 70,
          origin: { x: 0.35, y: 0.58 },
          colors,
          drift: -0.2,
        }),
      );
      scheduleConfetti(220, () =>
        fire({
          particleCount: 60,
          spread: 70,
          origin: { x: 0.65, y: 0.58 },
          colors,
          drift: 0.2,
        }),
      );
      scheduleConfetti(360, () =>
        fire({
          particleCount: 120,
          spread: 140,
          origin: { x: 0.5, y: 0.62 },
          colors,
        }),
      );
    },
    () => {
      for (let i = 0; i < 5; i += 1) {
        scheduleConfetti(i * 180, () => {
          fire({
            particleCount: 70,
            spread: 55,
            startVelocity: 58,
            decay: 0.93,
            scalar: 0.95,
            origin: {
              x: 0.2 + Math.random() * 0.6,
              y: 0.65 - Math.random() * 0.25,
            },
          });
        });
      }
    },
  ];

  const randomIndex = Math.floor(Math.random() * presets.length);
  const runPreset = presets[randomIndex] ?? presets[0];
  if (runPreset) {
    runPreset();
  }

  confettiCleanup = () => fire.reset();
  if (clearConfettiTimer) {
    clearTimeout(clearConfettiTimer);
  }
  clearConfettiTimer = setTimeout(() => {
    clearConfettiBursts();
    if (confettiCleanup) {
      confettiCleanup();
      confettiCleanup = null;
    }
    if (confettiCanvas) {
      confettiCanvas.remove();
      confettiCanvas = null;
    }
    clearConfettiTimer = null;
  }, 2600);
};
const triggerVictory = () => {
  showVictory.value = true;
  playVictorySound();
  launchFullscreenConfetti();
  if (victoryTimer) {
    clearTimeout(victoryTimer);
  }
  victoryTimer = setTimeout(() => {
    showVictory.value = false;
    victoryTimer = null;
  }, 2800);
};

const handleItemChange = (
  item: TodoBoardItem,
  checked: boolean | string | number,
) => {
  const isChecked = Boolean(checked);
  if (isChecked) {
    state.selectedIds.push(item.id);
    !canQuickComplete.value && playCompleteSound();
  } else {
    //移除
    state.selectedIds = state.selectedIds.filter((id) => id !== item.id);
  }
};

const handleCheckboxChange = (item: TodoBoardItem, checked: unknown) => {
  handleItemChange(item, Boolean(checked));
};
const isReady = ref(false);
const toggleAll = (value: boolean) => {
  if (canQuickComplete.value && value) return;
  state.selectedIds = state.list.map((item) => item.id);
};

const getData = async (date?: string) => {
  const queryDate = date ? dayjs(date) : dayjs();
  const todayData = await getTodayDailyPoints({});

  console.log(todayData?.recordDate, queryDate.format("YYYY-MM-DD"));
  if (todayData?.recordDate === queryDate.format("YYYY-MM-DD")) {
    state.selectedIds = Array.isArray(todayData.selectedIds)
      ? todayData.selectedIds
          .map((item) => Number(item))
          .filter(Number.isFinite)
      : [];
  }
  const todoList = await getTodoConfig();
  if (Array.isArray(todoList)) {
    state.list = todoList.map((item) => ({
      id: Number(item.id),
      title: item.title,
      completed: Boolean(item.completed),
    }));
  }
  isReady.value = true;
};
const list = computed(() => {
  return state.list.map((item) => {
    return { ...item, completed: state.selectedIds.includes(item.id) };
  });
});
onMounted(async () => {
  getData();
});

watch(
  () => state.selectedIds.length,
  async (newVal) => {
    if (!isReady.value) {
      return;
    }
    if (newVal > 0 && newVal === state.list.length) {
      triggerVictory();
    }
    const queryDate = dayjs();
    const points = Math.floor(
      (state.selectedIds?.length / state.list?.length) * 100,
    );
    await upsertDailyPoints({
      recordDate: queryDate.format("YYYY-MM-DD"),
      points,
      selectedIds: Array.from(state.selectedIds),
    });
    await g.update();
  },
);

onBeforeUnmount(() => {
  if (victoryTimer) {
    clearTimeout(victoryTimer);
  }
  if (clearConfettiTimer) {
    clearTimeout(clearConfettiTimer);
  }
  clearConfettiBursts();
  if (confettiCleanup) {
    confettiCleanup();
  }
  if (confettiCanvas) {
    confettiCanvas.remove();
  }
});
</script>

<template>
  <section class="todo-card">
    <Teleport to="body">
      <Transition name="victory-pop">
        <div v-if="showVictory" class="victory-layer">
          <div class="victory-glow"></div>
          <div class="victory-badge">🏆 挑战完成！今天你太棒了！</div>
          <p class="victory-subtitle">王者领袖已达成 · 继续闪耀</p>
        </div>
      </Transition>
    </Teleport>

    <div class="todo-header">
      <h3>{{ todoTitle }}</h3>
      <div class="todo-meta">
        <span class="badge"
          >{{ state.selectedIds?.length }}/{{ state.list?.length }} 已完成</span
        >
        <button
          class="quick-btn"
          type="button"
          :disabled="canQuickComplete"
          @click="toggleAll(true)"
        >
          一键完成
        </button>
      </div>
    </div>

    <div class="todo-progress">
      <div class="progress-top">
        <span>今日进度</span>
        <strong>{{ completionRate }}%</strong>
      </div>
      <div class="progress-track">
        <div
          class="progress-bar"
          :style="{ width: `${completionRate}%` }"
        ></div>
      </div>
      <p class="rank-hint">{{ rankHint }}</p>
      <div class="today-rank">
        <div class="rank-label">今日段位</div>
        <div class="rank-main">
          <span class="rank-emoji">{{ todayRank.emoji }}</span>
          <span class="rank-title">{{ todayRank.title }}</span>
        </div>
        <div class="rank-desc">{{ todayRank.description }}</div>
      </div>
    </div>

    <div class="todo-list">
      <div v-if="!list.length" class="todo-empty">
        还没有启用待办项，请到系统配置里勾选。
      </div>
      <label v-for="item in list" :key="item.id" class="todo-item">
        <el-checkbox
          :model-value="item.completed"
          size="large"
          @change="handleCheckboxChange(item, $event)"
        />
        <span :class="['todo-text', { done: item.completed }]">{{
          item.title
        }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped lang="less">
.todo-card {
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 20px auto 0;
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.55),
    rgba(255, 255, 255, 0.35)
  );
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  box-shadow: 0 16px 34px rgba(57, 81, 125, 0.16);
  overflow: hidden;
}

.victory-layer {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    circle at center,
    rgba(255, 255, 255, 0.24),
    rgba(13, 20, 41, 0.45)
  );
}

.victory-glow {
  position: absolute;
  width: min(80vw, 620px);
  height: min(80vw, 620px);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.7),
    rgba(255, 255, 255, 0.08) 60%,
    transparent 70%
  );
  animation: glow-pulse 1.2s ease-in-out infinite;
}

.victory-badge {
  position: relative;
  z-index: 2;
  padding: 14px 24px;
  border-radius: 999px;
  font-size: clamp(22px, 4.6vw, 44px);
  font-weight: 800;
  color: #fff;
  background: linear-gradient(90deg, #ff8a43, #ff4fc7 60%, #00a7ff);
  box-shadow: 0 18px 32px rgba(255, 113, 93, 0.45);
}

.victory-subtitle {
  position: relative;
  z-index: 2;
  margin: 10px 0 0;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: clamp(14px, 2.2vw, 22px);
  color: #fff;
  background: rgba(26, 32, 58, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@keyframes glow-pulse {
  0%,
  100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

.victory-pop-enter-active,
.victory-pop-leave-active {
  transition: opacity 0.25s ease;
}

.victory-pop-enter-from,
.victory-pop-leave-to {
  opacity: 0;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 24px;
    color: #314975;
  }
}

.todo-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #3e4b67;
  background: rgba(255, 255, 255, 0.64);
}

.quick-btn {
  border: 0;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  cursor: pointer;
  box-shadow: 0 6px 12px color-mix(in srgb, var(--sub-accent) 32%, transparent);
}

.quick-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  background: linear-gradient(90deg, #a9b2c8, #9aa6c2);
  box-shadow: none;
}

.todo-progress {
  margin-top: 12px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.72);
}

.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #405176;
  font-size: 13px;
}

.progress-track {
  margin-top: 8px;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  transition: width 0.28s ease;
}

.rank-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #5a6383;
}

.today-rank {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--main-accent) 20%, #fff),
      color-mix(in srgb, var(--sub-accent) 22%, #fff)
    ),
    rgba(255, 255, 255, 0.55);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--sub-accent) 24%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.rank-label {
  font-size: 12px;
  font-weight: 700;
  color: #526082;
}

.rank-main {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-emoji {
  font-size: 24px;
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(255, 184, 84, 0.35));
}

.rank-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #3f2f60;
}

.rank-desc {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #4f5d80;
}

.todo-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.68);
}

.todo-empty {
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  color: #5b6788;
  background: rgba(255, 255, 255, 0.48);
  border: 1px dashed rgba(255, 255, 255, 0.72);
}

.todo-text {
  font-size: 15px;
  color: #334569;
  transition: all 0.2s ease;
}

.todo-text.done {
  color: #8391ac;
  text-decoration: line-through;
}

@media (max-width: 768px) {
  .todo-card {
    border-radius: 20px;
    margin-top: 14px;
  }

  .todo-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
