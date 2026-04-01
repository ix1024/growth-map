<script setup lang="ts">
import dayjs from "dayjs";
import { getEatingCount } from "@/api/pet";
import {
  getDailyPoints,
  getTodayEatingCount,
  updateTodayEatingCount,
} from "@/api/dailyPoints";

const props = defineProps<{
  /** 待办完成率 0-100 */
  completionRate: number;
}>();

// ─── localStorage 持久化工具 ───
const STORAGE_KEY_POS = "pet-buddy-pos";
const STORAGE_KEY_COLLAPSED = "pet-buddy-collapsed";
const STORAGE_KEY_INTIMACY = "pet-buddy-intimacy";
const STORAGE_KEY_LAST_TOUCH = "pet-buddy-last-touch";
const STORAGE_KEY_STREAK_DAYS = "pet-buddy-streak-days";
const STORAGE_KEY_DAILY_EVENT = "pet-buddy-daily-event";
const STORAGE_KEY_LAST_CELEBRATION = "pet-buddy-last-celebration";

const loadPos = (): { x: number; y: number } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POS);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.x === "number" && typeof p.y === "number") return p;
  } catch {}
  return null;
};

const savePos = (x: number, y: number) => {
  localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x, y }));
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const loadIntimacy = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INTIMACY);
    const value = Number(raw);
    if (Number.isFinite(value)) return clampNumber(Math.floor(value), 0, 100);
  } catch {}
  return 24;
};

const saveIntimacy = (value: number) => {
  localStorage.setItem(STORAGE_KEY_INTIMACY, String(clampNumber(Math.floor(value), 0, 100)));
};

const loadLastTouch = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_TOUCH);
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  } catch {}
  return Date.now();
};

const saveLastTouch = (value: number) => {
  localStorage.setItem(STORAGE_KEY_LAST_TOUCH, String(value));
};

const loadStreakDays = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STREAK_DAYS);
    const value = Number(raw);
    if (Number.isFinite(value)) return clampNumber(Math.floor(value), 0, 999);
  } catch {}
  return 0;
};

const saveStreakDays = (value: number) => {
  localStorage.setItem(
    STORAGE_KEY_STREAK_DAYS,
    String(clampNumber(Math.floor(value), 0, 999)),
  );
};

const getCurrentMonthRange = () => {
  const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const endDate = dayjs().endOf("month").format("YYYY-MM-DD");
  return { startDate, endDate };
};

const loadDailyEventDate = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY_DAILY_EVENT) || "";
  } catch {}
  return "";
};

const saveDailyEventDate = (dateKey: string) => {
  localStorage.setItem(STORAGE_KEY_DAILY_EVENT, dateKey);
};

const loadLastCelebration = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_CELEBRATION) || "";
  } catch {}
  return "";
};

const saveLastCelebration = (dateKey: string) => {
  localStorage.setItem(STORAGE_KEY_LAST_CELEBRATION, dateKey);
};

const loadCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_COLLAPSED) === "1";
  } catch {}
  return false;
};

// ─── 状态 ───
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
type PetMood = "hungry" | "eating" | "happy" | "curious" | "bored" | "sleepy" | "shy" | "requesting";
type GrowthStage = "baby" | "child" | "teen" | "adult";
const petState = ref<PetMood>("hungry");
const showBubble = ref(true);
const bubbleText = ref("");
const growthDays = ref<number | null>(null);
const streakDays = ref(loadStreakDays());
const monthlyDailyPoints = ref<Array<{ recordDate: string; eating?: number }>>([]);
const isPetting = ref(false);
const isPoking = ref(false);
const isFeeding = ref(false);
const isCelebrating = ref(false);
const isSpecialAction = ref(false);
const isDancing = ref(false);
const taskPulse = ref(0);
const fedAmount = ref(0);
const intimacy = ref(loadIntimacy());
const lastTouchAt = ref(loadLastTouch());
const bounceY = ref(0);
const eyeBlink = ref(false);
const petScale = ref(1);
const collapsed = ref(loadCollapsed());

// 心形粒子
const hearts = ref<Array<{ x: number; y: number; opacity: number; size: number; vy: number }>>([]);
const confetti = ref<Array<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  life: number;
  color: string;
}>>([]);
const footprints = ref<Array<{
  x: number;
  y: number;
  opacity: number;
  size: number;
  rotation: number;
  vx: number;
  vy: number;
}>>([]);

// ─── 拖拽 ───
const posX = ref(0);
const posY = ref(0);
const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let hasMoved = false;

const clampPos = (x: number, y: number) => {
  const el = containerRef.value;
  if (!el) return { x, y };
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const maxX = window.innerWidth - w;
  const maxY = window.innerHeight - h;
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
};

const onPointerDown = (e: PointerEvent) => {
  // 忽略按钮点击
  if ((e.target as HTMLElement).closest("button")) return;
  isDragging.value = true;
  hasMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOriginX = posX.value;
  dragOriginY = posY.value;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
  const clamped = clampPos(dragOriginX + dx, dragOriginY + dy);
  posX.value = clamped.x;
  posY.value = clamped.y;
};

const onPointerUp = () => {
  if (isDragging.value) {
    isDragging.value = false;
    savePos(posX.value, posY.value);
  }
};

// ─── 文案 ───
const hungryTexts = [
  "肚子好饿呀…",
  "今天还没吃饭呢",
  "呜呜，好想吃东西",
  "完成任务才能喂我哦~",
  "我饿得眼冒金星了…",
  "有人记得我吗？",
  "好想吃好吃的…",
];

const happyTexts = [
  "好饱好开心！",
  "今天过得真棒~",
  "嗝~ 太满足啦！",
  "谢谢你喂我！",
  "幸福感爆棚！",
  "你是最棒的主人！",
];

const curiousTexts = [
  "你终于来啦！",
  "要不要陪我玩一会儿？",
  "我有在偷偷等你哦",
  "摸摸我，我会更喜欢你",
  "今天也一起加油吧",
];

const requestingTexts = [
  "来摸摸我嘛",
  "我想要你的关注",
  "戳一下我也可以",
  "陪我玩一会儿好不好",
  "我已经在等你啦",
];

const celebrationTexts = [
  "太厉害了！今天满分完成！",
  "今天你也太强了吧！",
  "冲刺成功，必须庆祝一下！",
  "满分达成，给你一个大大的赞！",
];

const taskBoostTexts = [
  "任务在变好，我看见啦！",
  "继续加油，我会陪你一起冲！",
  "进度涨了，我也跟着开心起来了",
  "今天的节奏不错，保持住！",
];

const dailyEvents = [
  {
    title: "今天发现了小玩具",
    text: "我捡到一个小玩具，要不要陪我玩一下？",
    intimacyDelta: 3,
  },
  {
    title: "今天有点想你",
    text: "今天好像特别想你，来陪我一会儿吧。",
    intimacyDelta: 4,
  },
  {
    title: "今天想被夸夸",
    text: "我今天表现不错吧？夸夸我，我会更开心。",
    intimacyDelta: 2,
  },
  {
    title: "今天想散步",
    text: "我有点坐不住了，陪我转一圈好吗？",
    intimacyDelta: 3,
  },
];

const shyTexts = [
  "哎呀，被戳到了…",
  "别突然戳我嘛，我会害羞",
  "嘻嘻，有点痒",
  "再戳我一次也可以，但要轻一点",
];

const boredTexts = [
  "我有点无聊了…",
  "你怎么还不来找我呀",
  "想和你玩一会儿",
  "我在这里等你好久了",
];

const sleepyTexts = [
  "我有点困了…",
  "今晚想早点休息",
  "哈欠…还想再陪你一会儿",
  "抱抱我，我就不困啦",
];

const pettingTexts = [
  "好舒服呀~",
  "再摸摸嘛~",
  "喵~",
  "嘿嘿嘿~",
  "头顶好痒~",
];

const feedableAmount = computed(() => Math.floor(props.completionRate));
const canFeed = computed(() => fedAmount.value < feedableAmount.value);
const satiety = computed(() => fedAmount.value);
const intimacyPercent = computed(() => intimacy.value);
const growthStage = computed<GrowthStage>(() => {
  const days = growthDays.value ?? 0;
  if (days < 7) return "baby";
  if (days < 30) return "child";
  if (days < 90) return "teen";
  return "adult";
});
const growthStageLabel = computed(() => {
  if (growthDays.value === null) {
    return "待成长";
  }
  switch (growthStage.value) {
    case "baby":
      return "幼崽";
    case "child":
      return "少年";
    case "teen":
      return "成长中";
    case "adult":
      return "成熟";
    default:
      return "幼崽";
  }
});
const growthStageScale = computed(() => {
  switch (growthStage.value) {
    case "baby":
      return 1.0;
    case "child":
      return 1.04;
    case "teen":
      return 1.08;
    case "adult":
      return 1.12;
    default:
      return 1.0;
  }
});
const growthPalette = computed(() => {
  switch (growthStage.value) {
    case "baby":
      return {
        bodyColor: "#F3D6FF",
        bodyGlow: "#FFF0FF",
        earInner: "#F7B9D3",
        eyeOpen: 6.2,
        eyeWidth: 2.6,
        blush: "rgba(255,171,194,0.42)",
        tailWidth: 6,
        accent: "#B57EDC",
      };
    case "child":
      return {
        bodyColor: "#FFE0B2",
        bodyGlow: "#FFF6DD",
        earInner: "#FFB74D",
        eyeOpen: 6.0,
        eyeWidth: 2.5,
        blush: "rgba(255,138,128,0.35)",
        tailWidth: 6,
        accent: "#E67E22",
      };
    case "teen":
      return {
        bodyColor: "#C8E6C9",
        bodyGlow: "#E8F5E9",
        earInner: "#81C784",
        eyeOpen: 5.8,
        eyeWidth: 2.4,
        blush: "rgba(255,138,128,0.28)",
        tailWidth: 6.2,
        accent: "#43A047",
      };
    case "adult":
      return {
        bodyColor: "#D7E3FF",
        bodyGlow: "#EEF4FF",
        earInner: "#90A4AE",
        eyeOpen: 5.4,
        eyeWidth: 2.3,
        blush: "rgba(255,138,128,0.22)",
        tailWidth: 6.2,
        accent: "#3D5A80",
      };
    default:
      return {
        bodyColor: "#E0E0E0",
        bodyGlow: "#F6F6F6",
        earInner: "#BDBDBD",
        eyeOpen: 5.5,
        eyeWidth: 2.4,
        blush: "rgba(255,138,128,0.3)",
        tailWidth: 6,
        accent: "#8D6E63",
      };
  }
});
const streakLabel = computed(() => `${streakDays.value} 天`);
const growthDaysLabel = computed(() => {
  return growthDays.value === null ? "--" : `${growthDays.value} 天`;
});

const streakMilestones = [3, 7, 14, 30];
const specialActionKey = "pet-buddy-last-special-action";
const streakRewardTexts = [
  "连续陪伴太棒了！我记住啦",
  "我们已经坚持好多天了，继续保持",
  "今天也没缺席，给你一个大大的赞",
  "这种默契我很喜欢，继续一起加油",
];
const danceTexts = [
  "跟着我一起跳起来！",
  "今天心情太好了，跳个舞吧",
  "转圈圈，开心一下",
  "来一段小小的庆祝舞",
];

const loadLastSpecialAction = (): string => {
  try {
    return localStorage.getItem(specialActionKey) || "";
  } catch {}
  return "";
};

const saveLastSpecialAction = (dateKey: string) => {
  localStorage.setItem(specialActionKey, dateKey);
};

const computeEatingStreak = (
  list: Array<{ recordDate: string; eating?: number }>,
) => {
  const eatingMap = new Map(
    list.map((record) => [record.recordDate, Number(record.eating ?? 0)]),
  );
  let streak = 0;
  let cursor = dayjs();
  const monthStart = dayjs().startOf("month");

  while (cursor.isSame(monthStart, "month")) {
    const dateKey = cursor.format("YYYY-MM-DD");
    const eating = Number(eatingMap.get(dateKey) ?? 0);
    if (eating > 0) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
      continue;
    }
    break;
  }

  return streak;
};

const syncStreakFromMonthlyPoints = (list: Array<{ recordDate: string; eating?: number }>) => {
  monthlyDailyPoints.value = list;
  const nextStreak = computeEatingStreak(list);
  const prevStreak = streakDays.value;
  streakDays.value = nextStreak;
  saveStreakDays(nextStreak);

  if (nextStreak > prevStreak && streakMilestones.includes(nextStreak)) {
    bubbleText.value =
      streakRewardTexts[Math.floor(Math.random() * streakRewardTexts.length)];
    showBubble.value = true;
    bumpIntimacy(nextStreak >= 14 ? 4 : nextStreak >= 7 ? 3 : 2);
    taskPulse.value = 1;
    setTimeout(() => {
      taskPulse.value = 0;
    }, 900);
    setTimeout(() => {
      if (!isPetting.value && !isPoking.value && !isFeeding.value) {
        showBubble.value = false;
      }
    }, 2400);
  }
};

const refreshMonthlyEatingStreak = async () => {
  const { startDate, endDate } = getCurrentMonthRange();
  try {
    const response = await getDailyPoints({ startDate, endDate });
    const list = Array.isArray(response?.list) ? response.list : [];
    syncStreakFromMonthlyPoints(list);
  } catch {
    // Keep the cached streak if the monthly query fails.
  }
};

const showDailyEvent = () => {
  const event = dailyEvents[Math.floor(Math.random() * dailyEvents.length)];
  bubbleText.value = `🎁 ${event.title}：${event.text}`;
  showBubble.value = true;
  bumpIntimacy(event.intimacyDelta);
  markInteraction();
  setTimeout(() => {
    if (showBubble.value) {
      showBubble.value = false;
    }
  }, 4500);
};

const triggerSpecialAction = () => {
  const todayKey = dayjs().format("YYYY-MM-DD");
  if (streakDays.value < 7 || loadLastSpecialAction() === todayKey) return;
  saveLastSpecialAction(todayKey);

  isSpecialAction.value = true;
  bubbleText.value = "✨ 解锁隐藏动作：转圈撒娇！";
  showBubble.value = true;
  bumpIntimacy(2);
  taskPulse.value = 1;
  setTimeout(() => {
    taskPulse.value = 0;
  }, 900);
  setTimeout(() => {
    if (showBubble.value) {
      showBubble.value = false;
    }
  }, 2200);
  setTimeout(() => {
    isSpecialAction.value = false;
  }, 1800);
};

const handleDance = () => {
  if (isFeeding.value || isCelebrating.value || hasMoved || isDancing.value) return;

  isDancing.value = true;
  petState.value = "happy";
  bubbleText.value = danceTexts[Math.floor(Math.random() * danceTexts.length)];
  showBubble.value = true;
  petScale.value = 1.12;
  bumpIntimacy(2);
  markInteraction();

  for (let i = 0; i < 10; i += 1) {
    hearts.value.push({
      x: 24 + Math.random() * 72,
      y: 12 + Math.random() * 34,
      opacity: 1,
      size: 10 + Math.random() * 8,
      vy: -0.7 - Math.random() * 0.8,
    });
  }

  const colors = ["#FFB74D", "#FF8A65", "#FFF176", "#F8BBD0", "#81D4FA"];
  for (let i = 0; i < 14; i += 1) {
    const angle = (Math.PI * 2 * i) / 14;
    const speed = 1.4 + Math.random() * 2.2;
    confetti.value.push({
      x: 60,
      y: 24,
      vx: Math.cos(angle) * speed * (0.9 + Math.random() * 0.4),
      vy: Math.sin(angle) * speed - 1.8,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 3.5 + Math.random() * 3.5,
      life: 1,
      color: colors[i % colors.length],
    });
  }

  setTimeout(() => {
    isDancing.value = false;
    petScale.value = 1;
    syncMood();
    setTimeout(() => {
      if (showBubble.value) {
        showBubble.value = false;
      }
    }, 1800);
  }, 1800);
};

const celebrateCompletion = () => {
  const todayKey = dayjs().format("YYYY-MM-DD");
  if (loadLastCelebration() === todayKey) return;
  saveLastCelebration(todayKey);

  isCelebrating.value = true;
  petScale.value = 1.16;
  petState.value = "happy";
  bubbleText.value =
    celebrationTexts[Math.floor(Math.random() * celebrationTexts.length)];
  showBubble.value = true;
  bumpIntimacy(5);
  markInteraction();

  for (let i = 0; i < 7; i += 1) {
    hearts.value.push({
      x: 28 + Math.random() * 64,
      y: 12 + Math.random() * 24,
      opacity: 1,
      size: 12 + Math.random() * 10,
      vy: -0.7 - Math.random() * 0.9,
    });
  }

  const colors = ["#FFB74D", "#FF8A65", "#FFD54F", "#FFF176", "#F06292", "#81D4FA"];
  for (let i = 0; i < 18; i += 1) {
    const angle = (Math.PI * 2 * i) / 18;
    const speed = 1.8 + Math.random() * 2.8;
    confetti.value.push({
      x: 60,
      y: 22,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.5),
      vy: Math.sin(angle) * speed - 2.4,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      size: 4 + Math.random() * 4,
      life: 1,
      color: colors[i % colors.length],
    });
  }

  for (let i = 0; i < 8; i += 1) {
    footprints.value.push({
      x: 34 + Math.random() * 52,
      y: 48 + Math.random() * 18,
      opacity: 0.48,
      size: 4 + Math.random() * 3,
      rotation: -0.35 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.15 - Math.random() * 0.15,
    });
  }

  setTimeout(() => {
    isCelebrating.value = false;
    petScale.value = 1;
    confetti.value = [];
    syncMood();
    setTimeout(() => {
      if (showBubble.value) {
        showBubble.value = false;
      }
    }, 2200);
  }, 2200);
};

const syncMood = () => {
  const hour = dayjs().hour();
  const idleMinutes = Math.floor((Date.now() - lastTouchAt.value) / 60000);

  if (isCelebrating.value) {
    petState.value = "happy";
    return;
  }

  if (isDancing.value) {
    petState.value = "happy";
    return;
  }

  if (isPoking.value) {
    petState.value = "shy";
    return;
  }

  if (isFeeding.value) {
    petState.value = "eating";
    return;
  }

  if (satiety.value < 30) {
    petState.value = "hungry";
    return;
  }

  if (hour >= 23 || hour < 7) {
    petState.value = intimacy.value >= 50 ? "sleepy" : "bored";
    return;
  }

  if (idleMinutes >= 20) {
    petState.value = intimacy.value >= 75 ? "requesting" : intimacy.value >= 65 ? "curious" : "bored";
    return;
  }

  if (idleMinutes >= 10 && intimacy.value >= 70) {
    petState.value = "requesting";
    return;
  }

  if (satiety.value >= 80 && intimacy.value >= 70) {
    petState.value = "happy";
    return;
  }

  if (intimacy.value >= 40) {
    petState.value = "curious";
    return;
  }

  petState.value = satiety.value >= 60 ? "hungry" : "hungry";
};

const getMoodTexts = () => {
  switch (petState.value) {
    case "happy":
      return happyTexts;
    case "curious":
      return curiousTexts;
    case "requesting":
      return requestingTexts;
    case "bored":
      return boredTexts;
    case "sleepy":
      return sleepyTexts;
    case "shy":
      return shyTexts;
    case "eating":
      return [
        "啊呜啊呜…",
        "好吃好吃",
        "我正在认真吃饭",
        "这一口很满足",
      ];
    default:
      return hungryTexts;
  }
};

const bumpIntimacy = (delta: number) => {
  intimacy.value = clampNumber(intimacy.value + delta, 0, 100);
  saveIntimacy(intimacy.value);
};

const markInteraction = () => {
  lastTouchAt.value = Date.now();
  saveLastTouch(lastTouchAt.value);
  syncMood();
};

watch([satiety, intimacy, isFeeding], () => {
  syncMood();
});

watch(isPoking, () => {
  syncMood();
});

watch(intimacy, () => {
  syncMood();
});

watch(
  () => props.completionRate,
  (newRate, oldRate) => {
    if (feedableAmount.value < fedAmount.value) {
      fedAmount.value = feedableAmount.value;
    }
    const prevRate = Number(oldRate ?? 0);
    const nextRate = Number(newRate ?? 0);
    if (nextRate > prevRate) {
      taskPulse.value = 1;
      setTimeout(() => {
        taskPulse.value = 0;
      }, 900);
      if (!isCelebrating.value && nextRate < 100) {
        bubbleText.value =
          taskBoostTexts[Math.floor(Math.random() * taskBoostTexts.length)];
        showBubble.value = true;
        bumpIntimacy(nextRate >= 80 ? 2 : 1);
        setTimeout(() => {
          if (showBubble.value && !isPetting.value && !isPoking.value && !isFeeding.value) {
            showBubble.value = false;
          }
        }, 1800);
      }
    }
    if (prevRate < 100 && nextRate >= 100) {
      celebrateCompletion();
    }
    syncMood();
  },
);

// ─── 自言自语 ───
let mumbleTimer: ReturnType<typeof setInterval> | null = null;
const startMumble = () => {
  if (mumbleTimer) clearInterval(mumbleTimer);
  mumbleTimer = setInterval(() => {
    if (isPetting.value || isFeeding.value || isDancing.value || collapsed.value) return;
    const texts = getMoodTexts();
    bubbleText.value = texts[Math.floor(Math.random() * texts.length)];
    showBubble.value = true;
    setTimeout(() => {
      showBubble.value = false;
    }, 3000);
  }, 6000);
};

let moodTimer: ReturnType<typeof setInterval> | null = null;
const startMoodLoop = () => {
  if (moodTimer) clearInterval(moodTimer);
  moodTimer = setInterval(() => {
    if (!isPetting.value && !isFeeding.value && !isDancing.value) {
      syncMood();
      if (
        petState.value === "requesting" &&
        !showBubble.value &&
        !collapsed.value
      ) {
        const texts = requestingTexts;
        bubbleText.value = texts[Math.floor(Math.random() * texts.length)];
        showBubble.value = true;
        setTimeout(() => {
          showBubble.value = false;
        }, 2800);
      }
    }
  }, 30000);
};

let dailyEventTimer: ReturnType<typeof setTimeout> | null = null;
const startDailyEvent = () => {
  const todayKey = dayjs().format("YYYY-MM-DD");
  if (loadDailyEventDate() === todayKey) return;
  saveDailyEventDate(todayKey);

  if (dailyEventTimer) clearTimeout(dailyEventTimer);
  dailyEventTimer = setTimeout(() => {
    if (collapsed.value) return;
    showDailyEvent();
  }, 1200);
};

// ─── 眨眼 ───
let blinkTimer: ReturnType<typeof setInterval> | null = null;
const startBlink = () => {
  if (blinkTimer) clearInterval(blinkTimer);
  blinkTimer = setInterval(() => {
    eyeBlink.value = true;
    setTimeout(() => {
      eyeBlink.value = false;
    }, 200);
  }, 3000 + Math.random() * 2000);
};

// ─── 弹跳动画 ───
let bounceFrame: number | null = null;
const jumpPhase = ref(0); // 0~1 跳跃进度，0=不跳
const jumpDir = ref(1); // 1=右跳，-1=左跳
const jumpOffsetX = ref(0);
const animateBounce = () => {
  const t = Date.now() / 600;
  const isHappy = petState.value === "happy" || petState.value === "curious" || petState.value === "requesting";
  const isCelebratingNow = isCelebrating.value;
  const isDancingNow = isDancing.value;
  const isSpecialActionNow = isSpecialAction.value;
  const isRequesting = petState.value === "requesting";
  const isShy = petState.value === "shy";
  const isSleepy = petState.value === "sleepy";

  if (isDancingNow) {
    const danceT = (Date.now() % 900) / 900;
    bounceY.value = Math.sin(danceT * Math.PI * 2) * 5;
    jumpPhase.value = danceT;
    jumpOffsetX.value = Math.sin(danceT * Math.PI * 4) * 9;
  } else if (isSpecialActionNow) {
    const spinT = (Date.now() % 900) / 900;
    bounceY.value = Math.sin(spinT * Math.PI * 2) * 4;
    jumpPhase.value = spinT;
    jumpOffsetX.value = Math.sin(spinT * Math.PI * 4) * 8;
  } else if (isHappy || isCelebratingNow) {
    // 开心蹦蹦跳跳：大幅弹跳 + 左右蹦
    const jumpT = (Date.now() % 1200) / 1200; // 0~1 周期 1.2s
    // 用抛物线模拟跳跃：y = -4h*t*(t-1)，h=16
    bounceY.value = -64 * jumpT * (jumpT - 1) * -1 + 2;
    // 左右小幅移动
    jumpPhase.value = jumpT;
    if (jumpT < 0.05) {
      jumpDir.value = Math.random() > 0.5 ? 1 : -1;
    }
    jumpOffsetX.value = Math.sin(jumpT * Math.PI) * 6 * jumpDir.value;
    if (isRequesting) {
      jumpOffsetX.value *= 0.6;
      bounceY.value += 1;
    }
  } else if (isShy) {
    bounceY.value = Math.sin(t * 2) * 2;
    jumpOffsetX.value = Math.sin(t * 3) * 1.5;
  } else if (isSleepy) {
    bounceY.value = Math.sin(t) * 1.2 + 1.2;
    jumpOffsetX.value = 0;
  } else {
    // 饿的时候只有微弱呼吸
    bounceY.value = Math.sin(t) * 3;
    jumpOffsetX.value = 0;
  }

  hearts.value = hearts.value
    .map((h) => ({ ...h, y: h.y + h.vy, opacity: h.opacity - 0.012 }))
    .filter((h) => h.opacity > 0);
  confetti.value = confetti.value
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08,
      rotation: p.rotation + p.vr,
      life: p.life - 0.015,
    }))
    .filter((p) => p.life > 0);
  footprints.value = footprints.value
    .map((f) => ({
      ...f,
      x: f.x + f.vx,
      y: f.y + f.vy,
      opacity: f.opacity - 0.015,
    }))
    .filter((f) => f.opacity > 0);
  bounceFrame = requestAnimationFrame(animateBounce);
};

// ─── Canvas 绘制 ───
const CANVAS_SIZE = 120;
const drawPet = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = CANVAS_SIZE;
  const h = CANVAS_SIZE;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2 + jumpOffsetX.value;
  const cy = h / 2 + 6 + bounceY.value;
  const baseScale = petScale.value * 0.72;
  const petVisualScale = 1.1;
  const stageScale = growthStageScale.value;

  // 开心时落地瞬间挤压、起跳拉伸
  const isHappy = petState.value === "happy" || petState.value === "curious";
  const isCelebratingNow = isCelebrating.value;
  const isDancingNow = isDancing.value;
  const isSpecialActionNow = isSpecialAction.value;
  const isRequesting = petState.value === "requesting";
  const isShy = petState.value === "shy";
  const isSleepy = petState.value === "sleepy";
  const isBored = petState.value === "bored";
  const taskGlow = taskPulse.value;
  const palette = growthPalette.value;
  let scaleX = baseScale;
  let scaleY = baseScale;
  if (isDancingNow) {
    const jt = (Date.now() % 900) / 900;
    const sq = 1 - Math.sin(jt * Math.PI * 2) * 0.08;
    scaleX = baseScale * (1 + (1 - sq) * 0.55);
    scaleY = baseScale * (1 + Math.sin(jt * Math.PI * 2) * 0.12);
  } else if (isHappy || isCelebratingNow) {
    const jt = jumpPhase.value;
    if (jt < 0.1) {
      // 起跳蓄力：横向压扁、纵向缩短
      const sq = 1 - Math.sin(jt / 0.1 * Math.PI * 0.5) * 0.15;
      scaleX = baseScale * (1 + (1 - sq) * 0.6);
      scaleY = baseScale * sq;
    } else if (jt > 0.35 && jt < 0.65) {
      // 空中：纵向拉伸
      scaleX = baseScale * 0.92;
      scaleY = baseScale * 1.08;
    } else if (jt > 0.9) {
      // 落地压扁
      const land = (jt - 0.9) / 0.1;
      const sq = 1 - Math.sin(land * Math.PI) * 0.18;
      scaleX = baseScale * (1 + (1 - sq) * 0.7);
      scaleY = baseScale * sq;
    }
  }
  if (taskGlow > 0) {
    scaleX *= 1 + taskGlow * 0.05;
    scaleY *= 1 + taskGlow * 0.05;
  }
  if (isDancingNow) {
    scaleX *= 1.06;
    scaleY *= 1.06;
  }
  if (isSpecialActionNow) {
    scaleX *= 1.06;
    scaleY *= 1.06;
  }

  ctx.save();
  ctx.translate(cx, cy);

  // 开心跳跃时微微歪头
  if (isDancingNow) {
    ctx.rotate(Math.sin(Date.now() / 180) * 0.28);
  } else if (isHappy) {
    const tilt = Math.sin(jumpPhase.value * Math.PI) * 0.08 * jumpDir.value;
    ctx.rotate(tilt);
    if (isRequesting) {
      ctx.rotate(Math.sin(Date.now() / 450) * 0.03);
    }
  } else if (isSpecialActionNow) {
    ctx.rotate(Math.sin(Date.now() / 180) * 0.32);
  } else if (isShy) {
    ctx.rotate(Math.sin(Date.now() / 500) * 0.05);
  } else if (isSleepy) {
    ctx.rotate(-0.04);
  }

  ctx.scale(scaleX * petVisualScale * stageScale, scaleY * petVisualScale * stageScale);

  if (taskGlow > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 48 + taskGlow * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 183, 77, ${0.12 + taskGlow * 0.18})`;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  if (isDancingNow) {
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 105, 180, ${0.14 + Math.abs(Math.sin(Date.now() / 200)) * 0.16})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (isSpecialActionNow) {
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(109, 76, 255, ${0.16 + Math.abs(Math.sin(Date.now() / 220)) * 0.16})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const bodyColor = isDancingNow
    ? "#FFB74D"
    : isHappy || isCelebratingNow
    ? "#FFD54F"
    : isRequesting
      ? "#FFE082"
    : palette.bodyColor;
  const bodyGlow = isDancingNow
    ? "#FFF176"
    : isHappy || isCelebratingNow
    ? "#FFF176"
    : isRequesting
      ? "#FFF5C2"
      : palette.bodyGlow;

  // 身体阴影（跳得越高阴影越小越淡）
  const shadowScale = isDancingNow
    ? 0.92
    : isHappy || isCelebratingNow
    ? 1 - Math.sin(jumpPhase.value * Math.PI) * 0.3
    : isRequesting
      ? 0.98
    : isShy
      ? 0.96
    : isSleepy
      ? 0.92
      : 1;
  const shadowAlpha = isDancingNow
    ? 0.06
    : isHappy || isCelebratingNow
    ? 0.08 - Math.sin(jumpPhase.value * Math.PI) * 0.04
    : isRequesting
      ? 0.07
    : isShy
      ? 0.07
    : isSleepy
      ? 0.06
      : 0.08;
  ctx.beginPath();
  ctx.ellipse(2, 42, 44 * shadowScale, 18 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.fill();

  // 身体
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 36, 0, 0, Math.PI * 2);
  const bodyGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 40);
  bodyGrad.addColorStop(0, bodyGlow);
  bodyGrad.addColorStop(1, bodyColor);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // 耳朵
  ctx.beginPath();
  ctx.moveTo(-28, -26); ctx.lineTo(-36, -52); ctx.lineTo(-14, -32);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-27, -30); ctx.lineTo(-33, -47); ctx.lineTo(-18, -33);
  ctx.closePath();
  ctx.fillStyle = isDancingNow ? "#FFCC80" : isHappy || isCelebratingNow ? "#FFAB91" : isRequesting ? "#FFCC80" : palette.earInner;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(28, -26); ctx.lineTo(36, -52); ctx.lineTo(14, -32);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(27, -30); ctx.lineTo(33, -47); ctx.lineTo(18, -33);
  ctx.closePath();
  ctx.fillStyle = isDancingNow ? "#FFCC80" : isHappy || isCelebratingNow ? "#FFAB91" : isRequesting ? "#FFCC80" : palette.earInner;
  ctx.fill();

  // 眼睛
  if (eyeBlink.value) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = palette.eyeWidth;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-8, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(16, -6); ctx.stroke();
  } else if (isDancingNow) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-12, -7, palette.eyeOpen, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -7, palette.eyeOpen, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  } else if (isHappy || isCelebratingNow) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = palette.eyeWidth;
    ctx.lineCap = "round";
    if (growthStage.value === "adult") {
      ctx.beginPath(); ctx.arc(-12, -7, palette.eyeOpen - 1.1, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, -7, palette.eyeOpen - 1.1, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(-12, -6, palette.eyeOpen, Math.PI, 0, true); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, -6, palette.eyeOpen, Math.PI, 0, true); ctx.stroke();
    }
  } else if (isRequesting) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = palette.eyeWidth;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-12, -6, palette.eyeOpen - 0.4, Math.PI, 0, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -6, palette.eyeOpen - 0.4, Math.PI, 0, true); ctx.stroke();
  } else if (isShy) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = palette.eyeWidth;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-12, -8, palette.eyeOpen - 1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -8, palette.eyeOpen - 1, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else if (isSleepy) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = palette.eyeWidth;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-16, -5); ctx.lineTo(-8, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(16, -5); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(-12, -6, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#5D4037"; ctx.fill();
    ctx.beginPath(); ctx.arc(-13, -8, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF"; ctx.fill();
    ctx.beginPath(); ctx.arc(12, -6, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#5D4037"; ctx.fill();
    ctx.beginPath(); ctx.arc(11, -8, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF"; ctx.fill();
  }

  // 腮红
  if (isDancingNow || isHappy || isCelebratingNow || isPetting.value || isShy || isRequesting) {
    ctx.beginPath(); ctx.ellipse(-22, 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.blush; ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.blush; ctx.fill();
  }

  // 嘴巴
  if (isDancingNow) {
    ctx.beginPath();
    ctx.arc(0, 7, 9, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  } else if (isHappy || isCelebratingNow) {
    ctx.beginPath();
    if (growthStage.value === "adult") {
      ctx.arc(0, 7, 9, 0.05 * Math.PI, 0.95 * Math.PI);
    } else {
      ctx.arc(0, 6, 8, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  } else if (isRequesting) {
    ctx.beginPath();
    ctx.arc(0, 8, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
  } else if (isShy) {
    ctx.beginPath();
    ctx.arc(0, 9, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = "#B26A7A"; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.stroke();
  } else if (isFeeding.value) {
    ctx.beginPath(); ctx.ellipse(0, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#EF5350"; ctx.fill();
  } else if (isSleepy) {
    ctx.beginPath();
    ctx.arc(0, 9, 6, 0.95 * Math.PI, 2.05 * Math.PI);
    ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 10, 5, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.stroke();
  }

  // 胡须
  ctx.strokeStyle = isDancingNow ? "#D46B08" : isHappy || isCelebratingNow ? "#8D6E63" : isRequesting ? "#C28B33" : palette.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-20, 2); ctx.lineTo(-38, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 6); ctx.lineTo(-38, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 2); ctx.lineTo(38, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(38, 8); ctx.stroke();

  // 尾巴
  ctx.beginPath();
  ctx.moveTo(34, 18);
  const tailWag = Math.sin(Date.now() / 300) * (isDancingNow ? 16 : isHappy || isCelebratingNow ? 12 : isRequesting ? 6 : isShy ? 3 : isSleepy ? 1 : isBored ? 2 : 4);
  ctx.quadraticCurveTo(55 + tailWag, 0, 48 + tailWag, -20);
  ctx.strokeStyle = bodyColor; ctx.lineWidth = palette.tailWidth; ctx.lineCap = "round"; ctx.stroke();

  // 饱食度进度条
  if (satiety.value > 0) {
    const barW = 40;
    const barH = 6;
    const barX = -barW / 2;
    const barY = 18;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
    const fillW = (satiety.value / 100) * barW;
    ctx.beginPath(); ctx.roundRect(barX, barY, fillW, barH, 3);
    const barGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    barGrad.addColorStop(0, "#66BB6A");
    barGrad.addColorStop(1, "#43A047");
    ctx.fillStyle = barGrad;
    ctx.fill();
  }

  if (intimacy.value > 0) {
    const chipW = 40;
    const chipH = 5;
    const chipX = -chipW / 2;
    const chipY = 26;
    ctx.beginPath(); ctx.roundRect(chipX, chipY, chipW, chipH, 3);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
    const chipFill = (intimacy.value / 100) * chipW;
    ctx.beginPath(); ctx.roundRect(chipX, chipY, chipFill, chipH, 3);
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipFill, chipY);
    chipGrad.addColorStop(0, "#FFB74D");
    chipGrad.addColorStop(1, "#FF7043");
    ctx.fillStyle = chipGrad;
    ctx.fill();
  }

  ctx.restore();

  // 心形粒子
  hearts.value.forEach((heart) => {
    ctx.save();
    ctx.globalAlpha = heart.opacity;
    ctx.fillStyle = "#FF6B6B";
    ctx.font = `${heart.size}px serif`;
    ctx.fillText("❤", heart.x, heart.y);
    ctx.restore();
  });

  // 庆祝彩纸
  confetti.value.forEach((piece) => {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.globalAlpha = Math.max(piece.life, 0);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.65);
    ctx.restore();
  });

  // 脚印轨迹
  footprints.value.forEach((step) => {
    ctx.save();
    ctx.translate(step.x, step.y);
    ctx.rotate(step.rotation);
    ctx.globalAlpha = Math.max(step.opacity, 0);
    ctx.fillStyle = "rgba(120, 88, 64, 0.38)";
    ctx.beginPath();
    ctx.ellipse(-step.size * 0.25, 0, step.size * 0.28, step.size * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(step.size * 0.25, 0, step.size * 0.28, step.size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

// ─── 摸它 ───
const handlePet = () => {
  if (isFeeding.value || hasMoved) return;
  isPetting.value = true;
  petScale.value = 1.08;
  bumpIntimacy(2);

  const petTexts = pettingTexts.concat(getMoodTexts());
  bubbleText.value = petTexts[Math.floor(Math.random() * petTexts.length)];
  showBubble.value = true;
  markInteraction();
  if (streakDays.value >= 7) {
    triggerSpecialAction();
  }

  for (let i = 0; i < 3; i++) {
    hearts.value.push({
      x: 30 + Math.random() * 60,
      y: 20 + Math.random() * 30,
      opacity: 1,
      size: 10 + Math.random() * 8,
      vy: -0.8 - Math.random() * 0.8,
    });
  }

  setTimeout(() => {
    isPetting.value = false;
    petScale.value = 1;
    syncMood();
    setTimeout(() => { showBubble.value = false; }, 2000);
  }, 1500);
};

const handlePoke = () => {
  if (isFeeding.value || hasMoved) return;
  isPoking.value = true;
  petScale.value = 1.06;
  bumpIntimacy(4);

  bubbleText.value = shyTexts[Math.floor(Math.random() * shyTexts.length)];
  showBubble.value = true;
  markInteraction();

  hearts.value.push(
    {
      x: 40 + Math.random() * 40,
      y: 18 + Math.random() * 18,
      opacity: 1,
      size: 12 + Math.random() * 6,
      vy: -0.6 - Math.random() * 0.4,
    },
    {
      x: 45 + Math.random() * 30,
      y: 20 + Math.random() * 16,
      opacity: 1,
      size: 9 + Math.random() * 6,
      vy: -0.5 - Math.random() * 0.5,
    },
  );

  setTimeout(() => {
    isPoking.value = false;
    petScale.value = 1;
    syncMood();
    setTimeout(() => {
      showBubble.value = false;
    }, 1800);
  }, 1100);
};

// ─── 喂食 ───
const handleFeed = () => {
  if (!canFeed.value || isFeeding.value) return;
  isFeeding.value = true;

  const step = Math.min(10, feedableAmount.value - fedAmount.value);
  let fed = 0;
  const feedInterval = setInterval(() => {
    fed++;
    fedAmount.value = Math.min(fedAmount.value + 1, feedableAmount.value);
    if (fed >= step || fedAmount.value >= feedableAmount.value) {
      clearInterval(feedInterval);
      void updateTodayEatingCount({ eating: fedAmount.value })
        .then((count) => {
          fedAmount.value = Math.min(Math.max(count, 0), feedableAmount.value);
          void refreshMonthlyEatingStreak();
        })
        .catch(() => {});
      bumpIntimacy(3);
      isFeeding.value = false;
      bubbleText.value = fedAmount.value >= 80 ? "好饱！谢谢你~" : "还想再吃一点…";
      showBubble.value = true;
      markInteraction();
      syncMood();
      setTimeout(() => { showBubble.value = false; }, 2500);
    }
  }, 150);
};

// ─── 折叠/展开 ───
const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
  localStorage.setItem(STORAGE_KEY_COLLAPSED, collapsed.value ? "1" : "0");
};

// ─── 绘制循环 ───
let drawFrame: number | null = null;
const drawLoop = () => {
  drawPet();
  drawFrame = requestAnimationFrame(drawLoop);
};

onMounted(() => {
  // 恢复位置，默认右下角
  const saved = loadPos();
  if (saved) {
    const clamped = clampPos(saved.x, saved.y);
    posX.value = clamped.x;
    posY.value = clamped.y;
  } else {
    posX.value = window.innerWidth - 180;
    posY.value = window.innerHeight - 280;
  }

  startMumble();
  startMoodLoop();
  startDailyEvent();
  startBlink();
  animateBounce();
  drawLoop();
  syncMood();

  void Promise.allSettled([getEatingCount(), getTodayEatingCount()]).then(
    ([growthResult, satietyResult]) => {
      if (growthResult.status === "fulfilled") {
        growthDays.value = growthResult.value;
      } else {
        growthDays.value = null;
      }

      if (satietyResult.status === "fulfilled") {
        fedAmount.value = Math.min(
          Math.max(satietyResult.value, 0),
          feedableAmount.value,
        );
      } else {
        fedAmount.value = 0;
      }

      petState.value = fedAmount.value >= 80 ? "happy" : "hungry";
      syncMood();
    },
  );
  void refreshMonthlyEatingStreak();

  bubbleText.value =
    props.completionRate >= 80
      ? "今天任务完成得不错哦~"
      : "快去完成任务来喂我吧~";

  if (props.completionRate >= 100) {
    setTimeout(() => {
      celebrateCompletion();
    }, 900);
  }
});

onUnmounted(() => {
  if (mumbleTimer) clearInterval(mumbleTimer);
  if (moodTimer) clearInterval(moodTimer);
  if (dailyEventTimer) clearTimeout(dailyEventTimer);
  if (blinkTimer) clearInterval(blinkTimer);
  if (bounceFrame) cancelAnimationFrame(bounceFrame);
  if (drawFrame) cancelAnimationFrame(drawFrame);
  footprints.value = [];
  confetti.value = [];
  hearts.value = [];
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="containerRef"
      class="pet-float"
      :class="{ collapsed, dragging: isDragging }"
      :style="{ left: posX + 'px', top: posY + 'px' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <!-- 折叠按钮 -->
      <button class="pet-toggle" @click="toggleCollapse">
        {{ collapsed ? '🐱' : '−' }}
      </button>

      <!-- 气泡 -->
      <Transition name="bubble">
        <div v-if="showBubble && bubbleText && !collapsed" class="pet-bubble">
          {{ bubbleText }}
        </div>
      </Transition>

      <!-- 折叠态只显示猫头 -->
      <template v-if="collapsed">
        <canvas
          ref="canvasRef"
          class="pet-canvas mini"
          @click="handlePet"
        />
      </template>

      <!-- 展开态 -->
      <template v-else>
        <canvas
          ref="canvasRef"
          class="pet-canvas"
          @click="handlePet"
        />

        <div class="pet-info">
          <div class="pet-satiety">
            <span class="satiety-label">饱食度</span>
            <span class="satiety-value">{{ satiety }}%</span>
          </div>
          <div class="pet-intimacy">
            <span class="intimacy-label">亲密度</span>
            <span class="intimacy-value">{{ intimacyPercent }}%</span>
          </div>
          <div class="pet-growth">
            <span class="growth-label">成长</span>
            <span class="growth-value">{{ growthDaysLabel }}</span>
          </div>
          <div class="pet-stage">
            <span class="stage-label">阶段</span>
            <span class="stage-value">{{ growthStageLabel }}</span>
          </div>
          <div class="pet-streak">
            <span class="streak-label">连续</span>
            <span class="streak-value">{{ streakLabel }}</span>
          </div>
          <div class="pet-status" :class="petState">
            {{
              petState === 'happy'
                ? '😊 开心'
                : petState === 'curious'
                  ? '✨ 想玩'
                  : petState === 'requesting'
                    ? '🥺 求关注'
                  : petState === 'shy'
                    ? '🙈 害羞'
                  : petState === 'bored'
                    ? '😶 无聊'
                    : petState === 'sleepy'
                      ? '😴 困了'
                      : petState === 'eating'
                        ? '🍽 吃饭中'
                        : '😿 饿饿'
            }}
          </div>
        </div>

        <div class="pet-actions">
          <button class="pet-btn pet-btn-pet" @click.stop="handlePet" :disabled="isPetting">
            🖐 摸摸
          </button>
          <button class="pet-btn pet-btn-poke" @click.stop="handlePoke" :disabled="isPoking">
            👆 戳戳
          </button>
          <button class="pet-btn pet-btn-dance" @click.stop="handleDance" :disabled="isDancing || isFeeding || isCelebrating">
            💃 跳舞
          </button>
          <button
            class="pet-btn pet-btn-feed"
            :class="{ disabled: !canFeed }"
            @click.stop="handleFeed"
            :disabled="!canFeed || isFeeding"
          >
            🍖 喂食
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.pet-float {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 20px;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.82),
    rgba(255, 255, 255, 0.52)
  );
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 28px rgba(31, 41, 55, 0.14);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.2s ease, border-radius 0.3s ease, padding 0.3s ease;

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 12px 36px rgba(31, 41, 55, 0.22);
  }

  &.collapsed {
    padding: 6px;
    border-radius: 50%;
    width: 64px;
    height: 64px;
    justify-content: center;
  }
}

.pet-toggle {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  color: #5D4037;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  .collapsed & {
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    font-size: 11px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
}

.pet-bubble {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  background: #fff;
  border-radius: 14px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #5D4037;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;

  &::after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #fff;
  }
}

.bubble-enter-active { transition: all 0.3s ease-out; }
.bubble-leave-active { transition: all 0.2s ease-in; }
.bubble-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-90%) scale(0.8);
}
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-110%) scale(0.9);
}

.pet-canvas {
  cursor: pointer;
  transition: transform 0.15s ease;

  &.mini {
    width: 64px !important;
    height: 64px !important;
  }

  &:active { transform: scale(0.96); }
}

.pet-info {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin-top: 2px;
}

.satiety-label {
  font-size: 11px;
  color: #8D6E63;
  font-weight: 600;
}

.satiety-value {
  font-size: 13px;
  font-weight: 800;
  color: #5D4037;
  margin-left: 4px;
}

.pet-intimacy {
  display: inline-flex;
  align-items: center;
}

.intimacy-label {
  font-size: 11px;
  color: #8D6E63;
  font-weight: 600;
}

.intimacy-value {
  font-size: 13px;
  font-weight: 800;
  color: #D46B08;
  margin-left: 4px;
}

.pet-growth {
  display: inline-flex;
  align-items: center;
}

.growth-label {
  font-size: 11px;
  color: #8D6E63;
  font-weight: 600;
}

.growth-value {
  font-size: 13px;
  font-weight: 800;
  color: #5D4037;
  margin-left: 4px;
}

.pet-stage {
  display: inline-flex;
  align-items: center;
}

.stage-label {
  font-size: 11px;
  color: #8D6E63;
  font-weight: 600;
}

.stage-value {
  font-size: 13px;
  font-weight: 800;
  color: #3D5A80;
  margin-left: 4px;
}

.pet-streak {
  display: inline-flex;
  align-items: center;
}

.streak-label {
  font-size: 11px;
  color: #8D6E63;
  font-weight: 600;
}

.streak-value {
  font-size: 13px;
  font-weight: 800;
  color: #C75C00;
  margin-left: 4px;
}

.pet-status {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;

  &.happy {
    background: rgba(102, 187, 106, 0.18);
    color: #2E7D32;
  }
  &.curious {
    background: rgba(255, 183, 77, 0.18);
    color: #E65100;
  }
  &.requesting {
    background: rgba(255, 241, 118, 0.28);
    color: #B26A00;
  }
  &.shy {
    background: rgba(248, 187, 208, 0.28);
    color: #AD1457;
  }
  &.bored {
    background: rgba(189, 189, 189, 0.22);
    color: #616161;
  }
  &.sleepy {
    background: rgba(211, 226, 255, 0.4);
    color: #3D5A80;
  }
  &.eating {
    background: rgba(255, 213, 79, 0.26);
    color: #A66A00;
  }
  &.hungry {
    background: rgba(255, 167, 38, 0.18);
    color: #E65100;
  }
}

.pet-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.pet-btn {
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 2px;

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.pet-btn-pet {
  background: linear-gradient(135deg, #FFE0B2, #FFCC80);
  color: #5D4037;
  box-shadow: 0 3px 8px rgba(255, 183, 77, 0.3);
}

.pet-btn-poke {
  background: linear-gradient(135deg, #FCE4EC, #F8BBD0);
  color: #8E244D;
  box-shadow: 0 3px 8px rgba(244, 143, 177, 0.28);
}

.pet-btn-dance {
  background: linear-gradient(135deg, #E1BEE7, #BA68C8);
  color: #4A148C;
  box-shadow: 0 3px 8px rgba(186, 104, 200, 0.28);
}

.pet-btn-feed {
  background: linear-gradient(135deg, #A5D6A7, #66BB6A);
  color: #1B5E20;
  box-shadow: 0 3px 8px rgba(102, 187, 106, 0.3);

  &.disabled {
    background: linear-gradient(135deg, #E0E0E0, #BDBDBD);
    color: #757575;
    box-shadow: none;
  }
}

@media (max-width: 640px) {
  .pet-float {
    width: min(calc(100vw - 12px), 288px);
    padding: 8px;
    border-radius: 18px;
  }

  .pet-canvas {
    width: 56px;
    height: 56px;

    &.mini {
      width: 46px !important;
      height: 46px !important;
    }
  }

  .pet-info {
    gap: 6px 8px;
  }

  .satiety-label,
  .intimacy-label,
  .growth-label,
  .stage-label,
  .streak-label,
  .pet-status {
    font-size: 10px;
  }

  .satiety-value,
  .intimacy-value,
  .growth-value,
  .stage-value,
  .streak-value {
    font-size: 12px;
  }

  .pet-actions {
    gap: 4px;
    margin-top: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .pet-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}
</style>
