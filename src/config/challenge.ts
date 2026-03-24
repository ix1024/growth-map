export interface ChallengeRank {
  key: "king" | "gold" | "silver" | "bronze";
  minProgress: number;
  emoji: string;
  title: string;
  description: string;
}

export const DEFAULT_WEEKLY_CHALLENGE_TARGET = 100;

export const CHALLENGE_RANKS: ChallengeRank[] = [
  {
    key: "king",
    minProgress: 100,
    emoji: "🏅",
    title: "王者领袖",
    description: "主动出击",
  },
  {
    key: "gold",
    minProgress: 80,
    emoji: "🥇",
    title: "黄金战将",
    description: "高度自律",
  },
  {
    key: "silver",
    minProgress: 60,
    emoji: "🥈",
    title: "白银骑士",
    description: "稳定完成",
  },
  {
    key: "bronze",
    minProgress: 0,
    emoji: "🥉",
    title: "青铜勇士",
    description: "成长中",
  },
];

export const resolveChallengeRank = (progress: number): ChallengeRank => {
  const normalized = Math.max(0, Math.min(progress, 100));
  const matched = CHALLENGE_RANKS.find((rank) => normalized >= rank.minProgress);
  return (
    matched ?? {
      key: "bronze",
      minProgress: 0,
      emoji: "🥉",
      title: "青铜勇士",
      description: "成长中",
    }
  );
};
