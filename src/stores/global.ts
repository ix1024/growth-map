import { defineStore } from "pinia";
import dayjs from "dayjs";
import { checkAuth } from "@/api/auth";
import { getDailyPoints } from "@/api/dailyPoints";
import { getExtraPoints } from "@/api/extraPoints";
import {
  getPointsConsumption,
  getPointsConsumptionSum,
} from "@/api/pointsConsumptions";
import { getSystemConfigs } from "@/api/systemConfig";
import {
  clearAuthSession,
  saveCheckedAuthUser,
} from "@/utils/authSession";
import { KidTheme } from "@/views/index.vue";

type PointsBucket = {
  points: number;
  attitudePoints: number;
  extraPoints: number;
  consumedPoints: number;
};

export const useGStore = defineStore("g", {
  state: () => ({
    theme: "eggparty" as KidTheme,
    loading: false,
    hasCheckedAuth: false,
    loggedIn: false,
    userInfo: {} as any,
    config: {} as any,
    dailyPoints: [] as any[],
    todoConfigItems: [] as any[],
    todayTodoConfigItems: [] as number[],
    extraPointsList: [] as any[],
    totalPoints: 0,
    totalAttitudePoints: 0,
    totalExtraPoints: 0,
    totalConsumedPoints: 0,
    weeklyPoints: {} as Record<string, PointsBucket>,
    monthlyPoints: {} as Record<string, PointsBucket>,
  }),
  actions: {
    async init() {
      await this.update();
    },
    async update() {
      await Promise.all([
        this.getAllDailyPoints(),
        this.getDayliyPoints(),
        this.getTotalConsumedPoints(),
        this.getTotalExtraPoints(),
        this.getConfig(),
      ]);
    },
    async login() {},
    //是否登录
    async checkAuthStatus() {
      this.loading = true;
      try {
        const result = await checkAuth();
        if (result.loggedIn && result.user) {
          this.loggedIn = true;
          this.userInfo = result.user as any;
          saveCheckedAuthUser(result.user);
          await this.init();
        } else {
          this.loggedIn = false;
          this.userInfo = {};
          clearAuthSession();
        }
      } catch {
        this.loggedIn = false;
        this.userInfo = {};
        clearAuthSession();
      } finally {
        this.loading = false;
        this.hasCheckedAuth = true;
      }
    },
    //用户信息
    async fetchUserInfo() {
      const result = await checkAuth();
      if (result.loggedIn && result.user) {
        this.userInfo = result.user as any;
        result.user.theme ? (this.theme = result.user.theme) : null;
        saveCheckedAuthUser(result.user);
      }
    },

    async getTotalConsumedPoints() {
      try {
        const data = await getPointsConsumptionSum();
        this.totalConsumedPoints = Number(data?.totalConsumedPoints || 0);
      } catch {
        this.totalConsumedPoints = 0;
      }
    },

    async getDayliyPoints(date?: string) {
      const queryDate = date ? dayjs(date) : dayjs();
      const start = queryDate.startOf("month").format("YYYY-MM-DD");
      const end = queryDate.endOf("month").format("YYYY-MM-DD");

      try {
        const [dailyData, extraData, consumption] = await Promise.all([
          getDailyPoints({
            startDate: start,
            endDate: end,
          }),
          getExtraPoints({
            startDate: start,
            endDate: end,
          }),
          getPointsConsumption({
            startDate: start,
            endDate: end,
          }),
        ]);

        const allDaily = Array.isArray(dailyData?.list) ? dailyData.list : [];
        const allExtra = Array.isArray(extraData?.list) ? extraData.list : [];
        const allConsumption = Array.isArray(consumption?.list)
          ? consumption.list
          : consumption;

        this.dailyPoints = allDaily;
        this.extraPointsList = allExtra;

        const monthly = allDaily
          .slice()
          .sort((a, b) => {
            const aTs = dayjs(a.updatedAt || a.createdAt || 0).valueOf();
            const bTs = dayjs(b.updatedAt || b.createdAt || 0).valueOf();
            if (aTs !== bTs) return aTs - bTs;
            return Number(a.id || 0) - Number(b.id || 0);
          })
          .reduce(
            (acc, item) => {
              const dateKey = dayjs(item.recordDate).format("YYYY-MM-DD");
              if (!dateKey || dateKey === "Invalid Date") return acc;
              if (!acc[dateKey]) {
                acc[dateKey] = {
                  points: 0,
                  attitudePoints: 0,
                  extraPoints: 0,
                  consumedPoints: 0,
                };
              }
              acc[dateKey].points = Math.max(
                acc[dateKey].points,
                Number(item.points || 0),
              );
              acc[dateKey].attitudePoints = Number(item.attitudePoints || 0);
              return acc;
            },
            {} as Record<string, PointsBucket>,
          );

        allExtra.forEach((extra) => {
          const dateKey = dayjs(extra.createdAt).format("YYYY-MM-DD");
          if (!dateKey || dateKey === "Invalid Date") return;

          if (!monthly[dateKey]) {
            monthly[dateKey] = {
              points: 0,
              attitudePoints: 0,
              extraPoints: 0,
              consumedPoints: 0,
            };
          }
          monthly[dateKey].extraPoints += Number(extra.points || 0);
        });
        if (Array.isArray(allConsumption)) {
          allConsumption?.forEach((item: any) => {
            const dateKey = dayjs(item.createdAt).format("YYYY-MM-DD");
            if (!dateKey || dateKey === "Invalid Date") return;
            if (!monthly[dateKey]) {
              monthly[dateKey] = {
                points: 0,
                attitudePoints: 0,
                extraPoints: 0,
                consumedPoints: 0,
              };
            }
            monthly[dateKey].consumedPoints += Number(item.consumedPoints || 0);
          });
        }

        this.monthlyPoints = monthly;
        // console.log(monthly);

        const weekStart = queryDate.startOf("week").add(1, "day");
        const weekEnd = weekStart.add(6, "day");
        this.weeklyPoints = Object.entries(monthly).reduce(
          (acc, [dayKey, value]) => {
            const current = dayjs(dayKey);
            if (current.isBefore(weekStart) || current.isAfter(weekEnd)) {
              return acc;
            }
            acc[dayKey] = value;
            return acc;
          },
          {} as Record<string, PointsBucket>,
        );
      } catch {
        this.dailyPoints = [];
        this.extraPointsList = [];
        this.monthlyPoints = {};
        this.weeklyPoints = {};
      }
    },

    async getAllDailyPoints() {
      try {
        const dailyData = await getDailyPoints();
        const allDaily = Array.isArray(dailyData?.list) ? dailyData.list : [];
        this.totalPoints = allDaily.reduce(
          (sum, item) => sum + Number(item.points || 0),
          0,
        );
        this.totalAttitudePoints = allDaily.reduce(
          (sum, item) => sum + Number(item.attitudePoints || 0),
          0,
        );
      } catch {
        this.totalPoints = 0;
        this.totalAttitudePoints = 0;
      }
    },

    async getTotalExtraPoints() {
      try {
        const data = await getExtraPoints();
        this.totalExtraPoints = Number(data?.totalPoints || 0);
      } catch {
        this.totalExtraPoints = 0;
      }
    },

    async getConfig() {
      try {
        const data = await getSystemConfigs();
        this.config = Array.isArray(data) ? (data[0] as any) || {} : {};
      } catch {
        this.config = {};
      }
    },
  },
  getters: {
    totalScore(state) {
      return (
        state.totalPoints + state.totalAttitudePoints + state.totalExtraPoints
      );
    },
    weeklyTotalPoints(state) {
      return Object.values(state.weeklyPoints).reduce(
        (sum, item) =>
          sum + item.points + item.attitudePoints + item.extraPoints,
        0,
      );
    },
    monthlyTotalPoints(state) {
      return Object.values(state.monthlyPoints).reduce(
        (sum, item) =>
          sum + item.points + item.attitudePoints + item.extraPoints,
        0,
      );
    },
    availablePoints(state) {
      return (
        state.totalPoints +
        state.totalAttitudePoints +
        state.totalExtraPoints -
        state.totalConsumedPoints
      );
    },
  },
});
