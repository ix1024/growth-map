<script setup lang="ts">
import dayjs from "dayjs";
import { getEatingCount } from "@/api/pet";
import {
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

const loadCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_COLLAPSED) === "1";
  } catch {}
  return false;
};

// ─── 状态 ───
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
type PetMood = "hungry" | "eating" | "happy" | "curious" | "bored" | "sleepy";
const petState = ref<PetMood>("hungry");
const showBubble = ref(true);
const bubbleText = ref("");
const growthDays = ref<number | null>(null);
const isPetting = ref(false);
const isFeeding = ref(false);
const fedAmount = ref(0);
const intimacy = ref(loadIntimacy());
const lastTouchAt = ref(loadLastTouch());
const bounceY = ref(0);
const eyeBlink = ref(false);
const petScale = ref(1);
const collapsed = ref(loadCollapsed());

// 心形粒子
const hearts = ref<Array<{ x: number; y: number; opacity: number; size: number; vy: number }>>([]);

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
const growthDaysLabel = computed(() => {
  return growthDays.value === null ? "--" : `${growthDays.value} 天`;
});

const syncMood = () => {
  const hour = dayjs().hour();
  const idleMinutes = Math.floor((Date.now() - lastTouchAt.value) / 60000);

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
    petState.value = intimacy.value >= 65 ? "curious" : "bored";
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
    case "bored":
      return boredTexts;
    case "sleepy":
      return sleepyTexts;
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

watch(
  () => props.completionRate,
  () => {
    if (feedableAmount.value < fedAmount.value) {
      fedAmount.value = feedableAmount.value;
    }
    syncMood();
  },
);

// ─── 自言自语 ───
let mumbleTimer: ReturnType<typeof setInterval> | null = null;
const startMumble = () => {
  if (mumbleTimer) clearInterval(mumbleTimer);
  mumbleTimer = setInterval(() => {
    if (isPetting.value || isFeeding.value || collapsed.value) return;
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
    if (!isPetting.value && !isFeeding.value) {
      syncMood();
    }
  }, 30000);
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
  const isHappy = petState.value === "happy" || petState.value === "curious";
  const isSleepy = petState.value === "sleepy";

  if (isHappy) {
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
  const baseScale = petScale.value * 0.62;

  // 开心时落地瞬间挤压、起跳拉伸
  const isHappy = petState.value === "happy" || petState.value === "curious";
  const isSleepy = petState.value === "sleepy";
  const isBored = petState.value === "bored";
  let scaleX = baseScale;
  let scaleY = baseScale;
  if (isHappy) {
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

  ctx.save();
  ctx.translate(cx, cy);

  // 开心跳跃时微微歪头
  if (isHappy) {
    const tilt = Math.sin(jumpPhase.value * Math.PI) * 0.08 * jumpDir.value;
    ctx.rotate(tilt);
  } else if (isSleepy) {
    ctx.rotate(-0.04);
  }

  ctx.scale(scaleX, scaleY);

  const bodyColor = isHappy
    ? "#FFD54F"
    : isSleepy
      ? "#D7E3FF"
      : "#E0E0E0";
  const bodyGlow = isHappy
    ? "#FFF176"
    : isSleepy
      ? "#EEF4FF"
      : "#BDBDBD";

  // 身体阴影（跳得越高阴影越小越淡）
  const shadowScale = isHappy
    ? 1 - Math.sin(jumpPhase.value * Math.PI) * 0.3
    : isSleepy
      ? 0.92
      : 1;
  const shadowAlpha = isHappy
    ? 0.08 - Math.sin(jumpPhase.value * Math.PI) * 0.04
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
  ctx.fillStyle = isHappy ? "#FFAB91" : isSleepy ? "#C5CAE9" : "#E8A0BF";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(28, -26); ctx.lineTo(36, -52); ctx.lineTo(14, -32);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(27, -30); ctx.lineTo(33, -47); ctx.lineTo(18, -33);
  ctx.closePath();
  ctx.fillStyle = isHappy ? "#FFAB91" : isSleepy ? "#C5CAE9" : "#E8A0BF";
  ctx.fill();

  // 眼睛
  if (eyeBlink.value) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-8, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(16, -6); ctx.stroke();
  } else if (isHappy) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(-12, -6, 6, Math.PI, 0, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, -6, 6, Math.PI, 0, true); ctx.stroke();
  } else if (isSleepy) {
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 2.4;
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
  if (isHappy || isPetting.value) {
    ctx.beginPath(); ctx.ellipse(-22, 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,138,128,0.35)"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,138,128,0.35)"; ctx.fill();
  }

  // 嘴巴
  if (isHappy) {
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = "#5D4037"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
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
  ctx.strokeStyle = isHappy ? "#8D6E63" : isSleepy ? "#D0D7E8" : "#BDBDBD";
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-20, 2); ctx.lineTo(-38, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 6); ctx.lineTo(-38, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 2); ctx.lineTo(38, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(38, 8); ctx.stroke();

  // 尾巴
  ctx.beginPath();
  ctx.moveTo(34, 18);
  const tailWag = Math.sin(Date.now() / 300) * (isHappy ? 12 : isSleepy ? 1 : isBored ? 2 : 4);
  ctx.quadraticCurveTo(55 + tailWag, 0, 48 + tailWag, -20);
  ctx.strokeStyle = bodyColor; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();

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
};

// ─── 摸它 ───
const handlePet = () => {
  if (isFeeding.value || hasMoved) return;
  isPetting.value = true;
  petScale.value = 1.08;
  bumpIntimacy(2);
  markInteraction();

  const petTexts = pettingTexts.concat(getMoodTexts());
  bubbleText.value = petTexts[Math.floor(Math.random() * petTexts.length)];
  showBubble.value = true;

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
        })
        .catch(() => {});
      bumpIntimacy(3);
      markInteraction();
      isFeeding.value = false;
      bubbleText.value = fedAmount.value >= 80 ? "好饱！谢谢你~" : "还想再吃一点…";
      showBubble.value = true;
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

  bubbleText.value =
    props.completionRate >= 80
      ? "今天任务完成得不错哦~"
      : "快去完成任务来喂我吧~";
});

onUnmounted(() => {
  if (mumbleTimer) clearInterval(mumbleTimer);
  if (moodTimer) clearInterval(moodTimer);
  if (blinkTimer) clearInterval(blinkTimer);
  if (bounceFrame) cancelAnimationFrame(bounceFrame);
  if (drawFrame) cancelAnimationFrame(drawFrame);
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
          <div class="pet-status" :class="petState">
            {{
              petState === 'happy'
                ? '😊 开心'
                : petState === 'curious'
                  ? '✨ 想玩'
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
    width: 52px !important;
    height: 52px !important;
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
</style>
