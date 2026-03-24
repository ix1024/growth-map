import {
  CLOUD_COLLECTIONS,
  insertCollectionRow,
  safeQueryCollectionAll,
  updateCollectionRows,
} from "@/utiils/cloudbase";

type QueryWhere = Record<string, unknown>;
type InsertData = Record<string, unknown>;

const queryByTable = async <T extends Record<string, unknown>>(
  table: (typeof CLOUD_COLLECTIONS)[keyof typeof CLOUD_COLLECTIONS],
  where?: QueryWhere,
) => {
  /**
   * 通用按表查询
   * - 表：table
   * - 条件：where（可选）
   * - 排序：createdAt 升序
   */
  return safeQueryCollectionAll<T>(table, {
    where,
    orderBy: { field: "createdAt", order: "asc" },
  });
};

const insertByTable = async (
  table: (typeof CLOUD_COLLECTIONS)[keyof typeof CLOUD_COLLECTIONS],
  data: InsertData,
) => {
  /**
   * 通用按表插入
   * - 表：table
   * - 数据：data
   */
  return insertCollectionRow(table, data);
};

export const cloudTableMethods = {
  /** daily_points 查询 */
  queryDailyPoints: (where?: QueryWhere) =>
    queryByTable(CLOUD_COLLECTIONS.DAILY_POINTS, where),
  /** daily_points 新增 */
  insertDailyPoints: (data: InsertData) =>
    insertByTable(CLOUD_COLLECTIONS.DAILY_POINTS, data),
  /** daily_points 更新 */
  updateDailyPoints: (where: QueryWhere, data: InsertData) =>
    updateCollectionRows(CLOUD_COLLECTIONS.DAILY_POINTS, where, data),

  /** extra_points 查询 */
  queryExtraPoints: (where?: QueryWhere) =>
    queryByTable(CLOUD_COLLECTIONS.EXTRA_POINTS, where),
  /** extra_points 新增 */
  insertExtraPoints: (data: InsertData) =>
    insertByTable(CLOUD_COLLECTIONS.EXTRA_POINTS, data),

  /** points_consumptions 查询 */
  queryPointsConsumptions: (where?: QueryWhere) =>
    queryByTable(CLOUD_COLLECTIONS.POINTS_CONSUMPTIONS, where),
  /** points_consumptions 新增 */
  insertPointsConsumptions: (data: InsertData) =>
    insertByTable(CLOUD_COLLECTIONS.POINTS_CONSUMPTIONS, data),

  /** system_configs 查询 */
  querySystemConfigs: (where?: QueryWhere) =>
    queryByTable(CLOUD_COLLECTIONS.SYSTEM_CONFIGS, where),
  /** system_configs 新增 */
  insertSystemConfigs: (data: InsertData) =>
    insertByTable(CLOUD_COLLECTIONS.SYSTEM_CONFIGS, data),

  /** todo_config_items 查询 */
  queryTodoConfigItems: (where?: QueryWhere) =>
    queryByTable(CLOUD_COLLECTIONS.TODO_CONFIG_ITEMS, where),
  /** todo_config_items 新增 */
  insertTodoConfigItems: (data: InsertData) =>
    insertByTable(CLOUD_COLLECTIONS.TODO_CONFIG_ITEMS, data),

  /** users 查询 */
  queryUsers: (where?: QueryWhere) => queryByTable(CLOUD_COLLECTIONS.USERS, where),
  /** users 新增 */
  insertUsers: (data: InsertData) => insertByTable(CLOUD_COLLECTIONS.USERS, data),
};
