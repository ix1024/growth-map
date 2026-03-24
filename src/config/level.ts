export const LEVEL_STEP_POINTS = 1000;
export const MAX_LEVEL = 20;

export const LEVEL_ANIMALS: string[] = [
  "小蚂蚁",
  "小松鼠",
  "小白兔",
  "小海豚",
  "小熊猫",
  "小狐狸",
  "小鹿",
  "小考拉",
  "小企鹅",
  "小猫头鹰",
  "小孔雀",
  "小狼",
  "小狮子",
  "小老虎",
  "小独角兽",
  "小飞马",
  "小神龙",
  "小凤凰",
  "星际麒麟",
  "森林王者",
];

export const LEVEL_ICONS: string[] = [
  "🐜",
  "🐿️",
  "🐇",
  "🐬",
  "🐼",
  "🦊",
  "🦌",
  "🐨",
  "🐧",
  "🦉",
  "🦚",
  "🐺",
  "🦁",
  "🐯",
  "🦄",
  "🪽",
  "🐉",
  "🐦‍🔥",
  "🦄",
  "👑",
];

export const getLevelByPoints = (points: number) => {
  const safePoints = Number.isFinite(points) ? Math.max(points, 0) : 0;
  const level = Math.min(Math.floor(safePoints / LEVEL_STEP_POINTS) + 1, MAX_LEVEL);
  const title = LEVEL_ANIMALS[level - 1] ?? LEVEL_ANIMALS[LEVEL_ANIMALS.length - 1];
  const currentLevelStart = (level - 1) * LEVEL_STEP_POINTS;
  const nextLevelTarget = level >= MAX_LEVEL ? MAX_LEVEL * LEVEL_STEP_POINTS : level * LEVEL_STEP_POINTS;
  return {
    level,
    title,
    currentLevelStart,
    nextLevelTarget,
  };
};

export const getLevelIcon = (level: number) => {
  const safeLevel = Math.max(1, Math.min(Math.round(level), LEVEL_ICONS.length));
  return LEVEL_ICONS[safeLevel - 1] ?? LEVEL_ICONS[0] ?? "⭐";
};
