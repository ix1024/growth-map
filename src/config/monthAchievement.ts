export interface MonthlyRewardRule {
  percent: number;
  rewardName: string;
}

export interface MonthlyAchievementConfig {
  title: string;
  targetPoints: number;
  requireContinuousCheckin: boolean;
  requiredStreakDays: number;
  rewards: MonthlyRewardRule[];
}

export const MONTHLY_ACHIEVEMENT_CONFIG: MonthlyAchievementConfig = {
  title: "本月成就",
  targetPoints: 2200,
  requireContinuousCheckin: true,
  requiredStreakDays: 21,
  rewards: [
    { percent: 100, rewardName: "修水游玩一次" },
    { percent: 90, rewardName: "去游乐场玩一次" },
    { percent: 80, rewardName: "去购物一次" },
  ],
};
