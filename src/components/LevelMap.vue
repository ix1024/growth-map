<script setup lang="ts">
import {
  getLevelByPoints,
  getLevelIcon,
  LEVEL_ANIMALS,
  LEVEL_STEP_POINTS,
} from "@/config/level";
import { useGStore } from "@/stores/global";

type MapNode = {
  level: number;
  title: string;
  x: number;
  y: number;
  targetPoints: number;
  side: "left" | "right";
};

type RoutePoint = {
  key: string;
  x: number;
  y: number;
  level?: number;
};

type RoadSegment = {
  key: string;
  from: RoutePoint;
  to: RoutePoint;
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  path: string;
};

const g = useGStore();

const viewBoxWidth = 920;
const viewBoxHeight = 1480;
const startPoint: RoutePoint = {
  key: "start",
  x: viewBoxWidth / 2,
  y: viewBoxHeight - 136,
};
const goalPoint: RoutePoint = { key: "goal", x: 458, y: 182 };

const currentScore = computed(() => Math.max(Number(g.totalScore || 0), 0));
const levelMeta = computed(() => getLevelByPoints(currentScore.value));

const nodes = computed<MapNode[]>(() => {
  const count = LEVEL_ANIMALS.length;
  const topY = 238;
  const bottomY = viewBoxHeight - 244;
  const stepY = (bottomY - topY) / Math.max(count - 1, 1);

  return LEVEL_ANIMALS.map((title, index) => {
    const progress = index / Math.max(count - 1, 1);
    const wave = Math.sin(progress * Math.PI * 2.6);
    const sway = Math.cos(progress * Math.PI * 5.1) * 34;
    const drift = Math.sin(progress * Math.PI * 8) * 18;
    const baseX = viewBoxWidth / 2 + wave * 228 + sway + drift;
    const x = Math.max(172, Math.min(viewBoxWidth - 172, baseX));
    const y = bottomY - stepY * index;
    const preferRight = x < viewBoxWidth / 2;
    const flipSide = index % 4 === 1 || index % 4 === 2;
    return {
      level: index + 1,
      title,
      x,
      y,
      targetPoints: (index + 1) * LEVEL_STEP_POINTS,
      side: preferRight !== flipSide ? "right" : "left",
    };
  });
});

const routePoints = computed<RoutePoint[]>(() => {
  return [
    startPoint,
    ...nodes.value.map((node) => ({
      key: `node-${node.level}`,
      x: node.x,
      y: node.y,
      level: node.level,
    })),
    goalPoint,
  ];
});

const formatSvgPoint = (x: number, y: number) =>
  `${x.toFixed(2)} ${y.toFixed(2)}`;

const buildBezierSegment = (
  previous: RoutePoint,
  current: RoutePoint,
  next: RoutePoint,
  afterNext: RoutePoint,
) => {
  const tension = 0.92;
  const cp1 = {
    x: current.x + ((next.x - previous.x) / 6) * tension,
    y: current.y + ((next.y - previous.y) / 6) * tension,
  };
  const cp2 = {
    x: next.x - ((afterNext.x - current.x) / 6) * tension,
    y: next.y - ((afterNext.y - current.y) / 6) * tension,
  };
  return {
    cp1,
    cp2,
    path: `M ${formatSvgPoint(current.x, current.y)} C ${formatSvgPoint(cp1.x, cp1.y)}, ${formatSvgPoint(cp2.x, cp2.y)}, ${formatSvgPoint(next.x, next.y)}`,
  };
};

const roadSegments = computed<RoadSegment[]>(() => {
  const points = routePoints.value;
  if (points.length < 2) return [];

  return points.slice(0, -1).map((point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1] ?? point;
    const afterNext = points[index + 2] ?? next;
    const segment = buildBezierSegment(previous, point, next, afterNext);
    return {
      key: `${point.key}-${next.key}`,
      from: point,
      to: next,
      cp1: segment.cp1,
      cp2: segment.cp2,
      path: segment.path,
    };
  });
});

const roadPath = computed(() => {
  const list = roadSegments.value;
  if (!list.length) return "";

  return list
    .map((segment, index) =>
      index === 0 ? segment.path : segment.path.replace(/^M [^C]+ C /, "C "),
    )
    .join(" ");
});

const nextGoalText = computed(() => {
  if (levelMeta.value.level >= LEVEL_ANIMALS.length) {
    return "已经到达地图终点";
  }
  const remaining = Math.max(
    levelMeta.value.nextLevelTarget - currentScore.value,
    0,
  );
  return `再攒 ${remaining} 分，就到 Lv.${levelMeta.value.level + 1}`;
});

const milestoneNodes = computed(() => {
  const picks = [0, 4, 9, 14, 19];
  return picks
    .map((index) => nodes.value[index])
    .filter((node): node is MapNode => Boolean(node));
});

const meadowPatches = [
  { x: 90, y: 1280, rx: 120, ry: 48, color: "#97d76f" },
  { x: 270, y: 1340, rx: 160, ry: 62, color: "#7cc95b" },
  { x: 490, y: 1300, rx: 178, ry: 56, color: "#8fdb73" },
  { x: 710, y: 1352, rx: 170, ry: 60, color: "#6fbe4b" },
  { x: 860, y: 1270, rx: 110, ry: 46, color: "#8dd06c" },
];

const flowers = [
  { x: 118, y: 1222, color: "#ff7db8" },
  { x: 186, y: 1176, color: "#ffd452" },
  { x: 308, y: 1248, color: "#7fd7ff" },
  { x: 584, y: 1190, color: "#ff9c7d" },
  { x: 760, y: 1244, color: "#ffe06b" },
  { x: 840, y: 1178, color: "#fd87c8" },
];
</script>

<template>
  <section class="level-map-card">
    <div class="level-map-head">
      <div>
        <p class="eyebrow">Rabbit Trail</p>
        <h2>{{ g.userInfo?.nickname || "成长" }}的成长地图</h2>
        <p class="level-map-desc">
          小兔子会沿着小路一路向前，每个路牌就是一个新的等级节点。
        </p>
      </div>
      <div class="current-panel">
        <span class="panel-kicker">当前位置</span>
        <strong>
          {{ getLevelIcon(levelMeta.level) }} Lv.{{ levelMeta.level }}
          {{ levelMeta.title }}
        </strong>
        <span>{{ currentScore }} 积分</span>
        <span>{{ nextGoalText }}</span>
      </div>
    </div>

    <div class="map-stage">
      <svg
        class="level-map-svg"
        :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
        role="img"
        aria-label="草原成长等级地图"
      >
        <defs>
          <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#a8e6ff" />
            <stop offset="45%" stop-color="#d7f5ff" />
            <stop offset="100%" stop-color="#fff6cc" />
          </linearGradient>
          <linearGradient id="road-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f3d39a" />
            <stop offset="100%" stop-color="#d8b276" />
          </linearGradient>
          <linearGradient id="road-edge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff0ca" />
            <stop offset="100%" stop-color="#c99555" />
          </linearGradient>
          <linearGradient id="node-active" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff7c2" />
            <stop offset="100%" stop-color="#ffb14b" />
          </linearGradient>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="0"
          y="0"
          :width="viewBoxWidth"
          :height="viewBoxHeight"
          fill="url(#sky-gradient)"
        />

        <g class="cloud-group">
          <ellipse cx="160" cy="110" rx="56" ry="30" class="cloud" />
          <ellipse cx="206" cy="100" rx="44" ry="24" class="cloud" />
          <ellipse cx="244" cy="112" rx="50" ry="28" class="cloud" />
          <ellipse cx="710" cy="150" rx="60" ry="32" class="cloud" />
          <ellipse cx="760" cy="140" rx="48" ry="25" class="cloud" />
          <ellipse cx="804" cy="154" rx="56" ry="30" class="cloud" />
        </g>

        <circle cx="794" cy="118" r="42" class="sun-core" />
        <circle cx="794" cy="118" r="58" class="sun-halo" />

        <g class="goal-castle" transform="translate(458 94)">
          <path class="castle-shadow" d="M -78 72 H 78 V 104 H -78 Z" />
          <rect
            class="castle-wall"
            x="-66"
            y="48"
            width="132"
            height="56"
            rx="10"
          />
          <rect
            class="castle-door"
            x="-16"
            y="70"
            width="32"
            height="34"
            rx="10"
          />
          <rect
            class="castle-tower"
            x="-78"
            y="24"
            width="28"
            height="80"
            rx="8"
          />
          <rect
            class="castle-tower"
            x="50"
            y="24"
            width="28"
            height="80"
            rx="8"
          />
          <rect
            class="castle-tower"
            x="-18"
            y="8"
            width="36"
            height="96"
            rx="10"
          />
          <path class="castle-flag" d="M 0 8 V -18 L 28 -8 L 0 2 Z" />
          <text class="goal-label" x="0" y="-34" text-anchor="middle">
            终点城堡
          </text>
        </g>

        <path :d="roadPath" class="road road-shadow" />
        <path :d="roadPath" class="road road-main" />
        <path :d="roadPath" class="road road-inner" />

        <g v-for="patch in meadowPatches" :key="`${patch.x}-${patch.y}`">
          <ellipse
            :cx="patch.x"
            :cy="patch.y"
            :rx="patch.rx"
            :ry="patch.ry"
            :fill="patch.color"
          />
        </g>

        <g v-for="flower in flowers" :key="`${flower.x}-${flower.y}`">
          <path
            :transform="`translate(${flower.x}, ${flower.y})`"
            class="flower-stem"
            d="M 0 0 C -2 16, -1 26, 0 38"
          />
          <circle
            :cx="flower.x"
            :cy="flower.y"
            r="9"
            :fill="flower.color"
            opacity="0.88"
          />
          <circle
            :cx="flower.x - 8"
            :cy="flower.y + 4"
            r="7"
            :fill="flower.color"
            opacity="0.78"
          />
          <circle
            :cx="flower.x + 8"
            :cy="flower.y + 4"
            r="7"
            :fill="flower.color"
            opacity="0.78"
          />
          <circle
            :cx="flower.x"
            :cy="flower.y + 10"
            r="7"
            :fill="flower.color"
            opacity="0.78"
          />
          <circle :cx="flower.x" :cy="flower.y + 4" r="4" fill="#fff5c3" />
        </g>

        <g
          v-for="node in nodes"
          :key="node.level"
          :class="[
            'level-node',
            {
              passed: node.level < levelMeta.level,
              current: node.level === levelMeta.level,
              locked: node.level > levelMeta.level,
            },
          ]"
        >
          <circle
            v-if="node.level === levelMeta.level"
            class="current-node-halo current-node-halo-outer"
            :cx="node.x"
            :cy="node.y"
            r="42"
          >
            <animate
              attributeName="r"
              values="38;56"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.42;0"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            v-if="node.level === levelMeta.level"
            class="current-node-halo current-node-pulse"
            :cx="node.x"
            :cy="node.y"
            r="42"
          >
            <animate
              attributeName="r"
              values="38;56"
              dur="2.2s"
              begin="1.1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.32;0"
              dur="2.2s"
              begin="1.1s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            v-if="node.level === levelMeta.level"
            class="current-node-halo"
            :cx="node.x"
            :cy="node.y"
            r="33"
          />
          <circle
            v-if="node.level === levelMeta.level"
            class="current-node-base"
            :cx="node.x"
            :cy="node.y"
            r="23"
          />
          <circle
            v-if="node.level === levelMeta.level"
            class="current-node-border"
            :cx="node.x"
            :cy="node.y"
            r="27"
          />
          <circle class="node-shadow" :cx="node.x" :cy="node.y" r="24" />
          <circle class="node-ring" :cx="node.x" :cy="node.y" r="26" />
          <circle class="node-core" :cx="node.x" :cy="node.y" r="19" />
          <text
            class="node-icon"
            :x="node.x"
            :y="node.y + 7"
            text-anchor="middle"
          >
            {{ getLevelIcon(node.level) }}
          </text>

          <g
            :transform="`translate(${node.x + (node.side === 'right' ? 42 : -178)}, ${node.y - 24})`"
          >
            <rect class="sign-board" width="136" height="42" rx="16" />
            <text class="sign-title" x="12" y="18">
              Lv.{{ node.level }} {{ node.title }}
            </text>
            <text class="sign-target" x="12" y="32">
              {{ node.targetPoints }} 分
            </text>
          </g>

          <g
            v-if="node.level < levelMeta.level"
            :transform="`translate(${node.x + 16}, ${node.y - 18})`"
          >
            <circle class="badge-check-bg" r="10" />
            <path class="badge-check" d="M -4 0 L -1 4 L 5 -4" />
          </g>
        </g>

        <g
          v-for="milestone in milestoneNodes"
          :key="`milestone-${milestone.level}`"
        >
          <circle
            :cx="milestone.x"
            :cy="milestone.y"
            r="30"
            fill="none"
            stroke="rgba(255,255,255,0.42)"
            stroke-width="2"
          />
        </g>

        <text x="462" y="1410" text-anchor="middle" class="start-label">
          起点 · Lv.1 从这里出发
        </text>
      </svg>
    </div>

    <div class="milestone-strip">
      <div
        v-for="node in milestoneNodes"
        :key="node.level"
        class="milestone-item"
        :class="{ active: node.level === levelMeta.level }"
      >
        <span class="milestone-level">
          {{ getLevelIcon(node.level) }} Lv.{{ node.level }}
        </span>
        <strong>{{ node.title }}</strong>
        <span>{{ node.targetPoints }} 分</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.level-map-card {
  width: 100%;
  max-width: 920px;
  margin: 24px auto 0;
  padding: 22px;
  border-radius: 30px;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.64)
    ),
    linear-gradient(
      135deg,
      rgba(175, 235, 255, 0.34),
      rgba(255, 233, 170, 0.28)
    );
  border: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(58, 90, 123, 0.2);
  backdrop-filter: blur(16px) saturate(126%);
  -webkit-backdrop-filter: blur(16px) saturate(126%);
}

.level-map-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(87, 111, 145, 0.72);
  font-weight: 900;
}

.level-map-head h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.05;
  color: #2f517d;
}

.level-map-desc {
  margin: 10px 0 0;
  max-width: 460px;
  color: #60739b;
}

.current-panel {
  min-width: 220px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.84),
    rgba(255, 248, 220, 0.88)
  );
  border: 1px solid rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 4px;
  color: #476286;
}

.panel-kicker {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: rgba(95, 114, 147, 0.72);
}

.map-stage {
  margin-top: 18px;
  padding: 10px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.7);
  overflow: hidden;
}

.level-map-svg {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 22px;
}

.cloud {
  fill: rgba(255, 255, 255, 0.7);
}

.sun-core {
  fill: #ffe58a;
}

.sun-halo {
  fill: rgba(255, 229, 138, 0.22);
}

.castle-shadow {
  fill: rgba(113, 126, 157, 0.1);
}

.castle-wall {
  fill: rgba(255, 247, 223, 0.95);
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 3;
}

.castle-door {
  fill: #ffb06a;
}

.castle-tower {
  fill: rgba(255, 250, 235, 0.98);
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 3;
}

.castle-flag {
  fill: #ff7a5c;
}

.goal-label {
  font-size: 16px;
  font-weight: 900;
  fill: #4d6794;
}

.road {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.road-shadow {
  stroke: rgba(127, 104, 64, 0.12);
  stroke-width: 42;
}

.road-main {
  stroke: url(#road-edge);
  stroke-width: 33;
}

.road-inner {
  stroke: url(#road-fill);
  stroke-width: 24;
  stroke-dasharray: 14 12;
}

.flower-stem {
  fill: none;
  stroke: #66b05a;
  stroke-width: 3;
  stroke-linecap: round;
}

.node-shadow {
  fill: rgba(92, 126, 80, 0.12);
}

.current-node-halo {
  fill: none;
  stroke: rgba(255, 170, 72, 0.72);
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
}

.current-node-halo-outer {
  stroke: rgba(255, 196, 104, 0.5);
  stroke-width: 6;
}

.current-node-pulse {
  stroke: rgba(255, 196, 104, 0.36);
  stroke-width: 5;
}

.current-node-base {
  fill: #ffe3a3;
}

.current-node-border {
  fill: none;
  stroke: rgba(255, 255, 255, 0.96);
  stroke-width: 6;
}

.node-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 2;
}

.node-core {
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 4;
  transition:
    fill 0.25s ease,
    opacity 0.25s ease,
    transform 0.25s ease;
}

.node-icon {
  font-size: 20px;
  font-weight: 900;
  fill: #3b527f;
  transition:
    fill 0.25s ease,
    opacity 0.25s ease;
}

.sign-board {
  fill: rgba(255, 255, 255, 0.8);
  stroke: rgba(255, 255, 255, 0.9);
  stroke-width: 1.25;
  transition:
    fill 0.25s ease,
    stroke 0.25s ease,
    opacity 0.25s ease;
}

.sign-title {
  font-size: 12px;
  font-weight: 800;
  fill: #38547f;
  transition:
    fill 0.25s ease,
    opacity 0.25s ease;
}

.sign-target {
  font-size: 10px;
  fill: #6d80a2;
  transition:
    fill 0.25s ease,
    opacity 0.25s ease;
}

.level-node.passed .node-core {
  fill: url(#node-active);
  filter: saturate(1.08);
}

.level-node.passed .node-ring {
  stroke: rgba(255, 202, 92, 0.95);
}

.level-node.passed .node-shadow {
  fill: rgba(255, 191, 74, 0.16);
}

.level-node.passed .sign-board {
  fill: rgba(255, 249, 224, 0.88);
  stroke: rgba(255, 231, 166, 0.96);
}

.level-node.passed .sign-title {
  fill: #8b5a12;
}

.level-node.passed .sign-target {
  fill: #b07b2e;
}

.level-node.current .node-core {
  fill: #fff7d2;
  transform: none;
}

.level-node.current .node-ring {
  stroke: rgba(255, 168, 92, 0.18);
  stroke-width: 2;
}

.level-node.current .node-shadow {
  fill: rgba(255, 148, 72, 0.26);
}

.level-node.current .sign-board {
  fill: rgba(255, 244, 214, 0.94);
  stroke: rgba(255, 173, 110, 0.95);
  box-shadow: 0 0 0 1px rgba(255, 204, 136, 0.18);
}

.level-node.current .sign-title {
  fill: #b85f1b;
}

.level-node.current .sign-target {
  fill: #cc7f3e;
}

.level-node.locked .node-core {
  fill: rgba(227, 236, 246, 0.96);
  opacity: 0.68;
}

.level-node.locked .node-ring {
  stroke: rgba(178, 194, 216, 0.6);
}

.level-node.locked .node-icon {
  fill: rgba(90, 111, 145, 0.62);
}

.level-node.locked .sign-board {
  fill: rgba(240, 245, 251, 0.52);
  stroke: rgba(223, 233, 245, 0.76);
  opacity: 0.72;
}

.level-node.locked .sign-title {
  fill: rgba(97, 118, 152, 0.74);
}

.level-node.locked .sign-target {
  fill: rgba(125, 144, 173, 0.72);
}

.badge-check-bg {
  fill: #ffb84d;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 2;
}

.badge-check {
  fill: none;
  stroke: white;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rabbit-body {
  fill: #fffaf7;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 2.5;
}

.rabbit-label {
  font-size: 16px;
  font-weight: 900;
  fill: #ff7d45;
}

.start-label {
  font-size: 16px;
  font-weight: 900;
  fill: rgba(75, 103, 76, 0.82);
}

.milestone-strip {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.milestone-item {
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.7);
  display: grid;
  gap: 4px;
  color: #567094;
}

.milestone-item.active {
  background: linear-gradient(
    135deg,
    rgba(255, 243, 187, 0.9),
    rgba(210, 244, 255, 0.88)
  );
}

.milestone-level {
  font-size: 12px;
  font-weight: 900;
  color: rgba(95, 114, 147, 0.74);
}

@media (max-width: 820px) {
  .level-map-card {
    padding: 16px;
    border-radius: 24px;
  }

  .level-map-head {
    flex-direction: column;
  }

  .current-panel {
    width: 100%;
    min-width: 0;
  }

  .milestone-strip {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .milestone-strip {
    grid-template-columns: 1fr;
  }
}
</style>
