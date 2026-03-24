<script setup lang="ts">
import dayjs from "dayjs";
import { ElMessage } from "element-plus";
import {
  getLevelByPoints,
  getLevelIcon,
  LEVEL_ANIMALS,
  LEVEL_STEP_POINTS,
} from "@/config/level";
import { logout } from "@/api/auth";
import { uploadImage } from "@/api/image";
import { updateUserProfile } from "@/api/user";
import { clearAuthSession } from "@/utils/authSession";
import { useGStore } from "@/stores/global";
import { router } from "@/router";
const g = useGStore();
const loggingOut = ref(false);
const profileDialogVisible = ref(false);
const profileSubmitting = ref(false);
const avatarFileInput = ref<HTMLInputElement | null>(null);
const avatarCropDialogVisible = ref(false);
const cropImageElement = ref<HTMLImageElement | null>(null);
const cropImageSource = ref("");
const cropZoom = ref(1);
const cropBaseScale = ref(1);
const cropDragging = ref(false);
const profileForm = reactive({
  nickname: "",
  avatar: "",
  birthDate: "",
  gender: "",
  oldPassword: "",
  password: "",
});
const initialProfileBirthDate = ref("");
const cropState = reactive({
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});

const CROP_SIZE = 320;
const CROP_OUTPUT_SIZE = 1024;
const CROP_MAX_ZOOM = 3;

const avatarSrc = computed(() => String(g.userInfo?.avatar || "").trim());
const avatarFallbackText = computed(() => {
  const name = String(g.userInfo?.nickname || g.userInfo?.username || "").trim();
  return name ? name.slice(0, 1) : "成";
});
const weekAttitudePoints = computed(() =>
  Object.values(g.weeklyPoints).reduce(
    (sum, item) => sum + Number(item.attitudePoints || 0),
    0,
  ),
);
const showLevelPanel = ref(false);
const levelMeta = computed(() => getLevelByPoints(g.totalScore));
const levelTargetPoints = computed(() => {
  const score = Math.max(Number(g.totalScore || 0), 0);
  return Math.max(1000, Math.ceil(score / 1000) * 1000);
});
const levelList = computed(() =>
  LEVEL_ANIMALS.map((title, index) => {
    const level = index + 1;
    const currentTarget = level * LEVEL_STEP_POINTS;
    return {
      level,
      title,
      targetText: `总积分达到 ${currentTarget}`,
    };
  }),
);
const levelProgressPercent = computed(() => {
  const percent = (g.totalScore / Math.max(levelTargetPoints.value, 1)) * 100;
  return Math.max(0, Math.min(percent, 100));
});

const age = computed(() => {
  const currentAge = Number(g.userInfo.age);
  if (Number.isFinite(currentAge) && currentAge >= 0) return currentAge;
  if (!g.userInfo.birthDate) return "--";
  const birth = dayjs(g.userInfo.birthDate);
  if (!birth.isValid()) return "--";
  return Math.max(dayjs().diff(birth, "year"), 0);
});

const genderOptions = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
  { label: "保密", value: "other" },
] as const;

const profileAvatarPreview = computed(() => {
  return profileForm.avatar.trim();
});

const cropScale = computed(() => cropBaseScale.value * cropZoom.value);
const cropDisplaySize = computed(() => {
  const image = cropImageElement.value;
  if (!image) {
    return { width: 0, height: 0 };
  }
  const scale = cropScale.value;
  return {
    width: image.naturalWidth * scale,
    height: image.naturalHeight * scale,
  };
});

const triggerAvatarUpload = () => {
  avatarFileInput.value?.click();
};

const clampCropPosition = () => {
  const { width, height } = cropDisplaySize.value;
  if (!width || !height) return;

  if (width <= CROP_SIZE) {
    cropState.x = (CROP_SIZE - width) / 2;
  } else {
    cropState.x = Math.min(0, Math.max(CROP_SIZE - width, cropState.x));
  }

  if (height <= CROP_SIZE) {
    cropState.y = (CROP_SIZE - height) / 2;
  } else {
    cropState.y = Math.min(0, Math.max(CROP_SIZE - height, cropState.y));
  }
};

const initCropPosition = () => {
  const { width, height } = cropDisplaySize.value;
  if (!width || !height) return;
  cropState.x = (CROP_SIZE - width) / 2;
  cropState.y = (CROP_SIZE - height) / 2;
  clampCropPosition();
};

const loadImageElement = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
};

const openAvatarCropDialog = async (src: string) => {
  const image = await loadImageElement(src);
  cropImageElement.value = image;
  cropImageSource.value = src;
  cropZoom.value = 1;
  cropBaseScale.value = Math.max(
    CROP_SIZE / image.naturalWidth,
    CROP_SIZE / image.naturalHeight,
  );
  await nextTick();
  initCropPosition();
  avatarCropDialogVisible.value = true;
};

const handleAvatarFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    ElMessage.warning("请选择图片文件");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning("图片不能超过 2MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === "string" && result) {
      void openAvatarCropDialog(result).catch(() => {
        ElMessage.error("图片读取失败，请重试");
      });
    }
  };
  reader.onerror = () => {
    ElMessage.error("图片读取失败，请重试");
  };
  reader.readAsDataURL(file);
};

const applyCropToAvatar = async () => {
  const image = cropImageElement.value;
  if (!image) {
    ElMessage.warning("请先选择图片");
    return;
  }

  const scale = cropScale.value;
  const sx = Math.max(0, -cropState.x / scale);
  const sy = Math.max(0, -cropState.y / scale);
  const sWidth = CROP_SIZE / scale;
  const sHeight = CROP_SIZE / scale;

  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    ElMessage.error("图片裁剪失败");
    return;
  }

  ctx.drawImage(
    image,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    CROP_OUTPUT_SIZE,
    CROP_OUTPUT_SIZE,
  );
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) {
    ElMessage.error("图片裁剪失败");
    return;
  }

  const file = new File([blob], "avatar.png", {
    type: "image/png",
  });

  profileSubmitting.value = true;
  try {
    const imageItem = await uploadImage(file);
    if (!imageItem?.url) {
      ElMessage.error("图片上传失败");
      return;
    }
    profileForm.avatar = imageItem.url;
    avatarCropDialogVisible.value = false;
    ElMessage.success("头像上传成功");
  } catch {
    // global error handler already shows message
  } finally {
    profileSubmitting.value = false;
  }
};

const resetAvatarCropState = () => {
  avatarCropDialogVisible.value = false;
  cropImageElement.value = null;
  cropImageSource.value = "";
  cropZoom.value = 1;
  cropBaseScale.value = 1;
  cropDragging.value = false;
  cropState.x = 0;
  cropState.y = 0;
  cropState.startX = 0;
  cropState.startY = 0;
  cropState.originX = 0;
  cropState.originY = 0;
};

const cancelAvatarCrop = () => {
  resetAvatarCropState();
};

const handleCropPointerDown = (event: PointerEvent) => {
  if (!cropImageElement.value) return;
  cropDragging.value = true;
  cropState.startX = event.clientX;
  cropState.startY = event.clientY;
  cropState.originX = cropState.x;
  cropState.originY = cropState.y;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const handleCropPointerMove = (event: PointerEvent) => {
  if (!cropDragging.value) return;
  const deltaX = event.clientX - cropState.startX;
  const deltaY = event.clientY - cropState.startY;
  cropState.x = cropState.originX + deltaX;
  cropState.y = cropState.originY + deltaY;
  clampCropPosition();
};

const handleCropPointerUp = (event: PointerEvent) => {
  cropDragging.value = false;
  try {
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  } catch {
    // no-op
  }
};

watch(cropZoom, (nextZoom, prevZoom) => {
  if (!cropImageElement.value) return;
  const prevScale = cropBaseScale.value * prevZoom;
  const nextScale = cropBaseScale.value * nextZoom;
  const centerX = CROP_SIZE / 2;
  const centerY = CROP_SIZE / 2;
  const sourceCenterX = (centerX - cropState.x) / prevScale;
  const sourceCenterY = (centerY - cropState.y) / prevScale;
  cropState.x = centerX - sourceCenterX * nextScale;
  cropState.y = centerY - sourceCenterY * nextScale;
  clampCropPosition();
});

const normalizeGenderValue = (value: unknown) => {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }
  if (value === "男") return "male";
  if (value === "女") return "female";
  if (value === "保密") return "other";
  return "";
};

const normalizeBirthDateValue = (value: unknown) => {
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
};

const getDefaultBirthDate = () => {
  return dayjs().subtract(5, "year").format("YYYY-MM-DD");
};

const disabledBirthDate = (date: Date) => {
  return dayjs(date).isAfter(dayjs().subtract(5, "year"), "day");
};

const syncProfileForm = () => {
  profileForm.nickname = String(g.userInfo?.nickname || "");
  profileForm.avatar = String(g.userInfo?.avatar || "");
  const normalizedBirthDate =
    normalizeBirthDateValue(g.userInfo?.birthDate) || getDefaultBirthDate();
  profileForm.birthDate = normalizedBirthDate;
  initialProfileBirthDate.value = normalizedBirthDate;
  profileForm.gender = normalizeGenderValue(g.userInfo?.gender);
  profileForm.oldPassword = "";
  profileForm.password = "";
};

const openProfileDialog = () => {
  syncProfileForm();
  profileDialogVisible.value = true;
};

const closeProfileDialog = () => {
  profileDialogVisible.value = false;
};

const handleSaveProfile = async () => {
  const nickname = profileForm.nickname.trim();
  const avatar = profileForm.avatar.trim();
  const birthDate = normalizeBirthDateValue(profileForm.birthDate);
  const gender = normalizeGenderValue(profileForm.gender);
  const oldPassword = profileForm.oldPassword;
  const password = profileForm.password;

  if (nickname && nickname.length > 32) {
    ElMessage.warning("昵称长度不能超过 32 个字符");
    return;
  }
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    ElMessage.warning("出生日期格式必须是 YYYY-MM-DD");
    return;
  }
  if (
    birthDate &&
    dayjs().diff(dayjs(birthDate, "YYYY-MM-DD"), "year") < 5
  ) {
    ElMessage.warning("最小年龄是 5 岁");
    return;
  }
  if (gender && !genderOptions.some((item) => item.value === gender)) {
    ElMessage.warning("性别只能选择 male、female 或 other");
    return;
  }
  if (password && password.length < 6) {
    ElMessage.warning("新密码至少 6 位");
    return;
  }
  if (password && !oldPassword) {
    ElMessage.warning("修改密码时必须填写旧密码");
    return;
  }
  if (!password && oldPassword) {
    ElMessage.warning("请先输入新密码");
    return;
  }

  const payload: Parameters<typeof updateUserProfile>[0] = {};
  if (nickname) payload.nickname = nickname;
  if (avatar) payload.avatar = avatar;
  if (birthDate && birthDate !== initialProfileBirthDate.value) {
    payload.birthDate = birthDate;
  }
  if (gender) payload.gender = gender;
  if (password) {
    payload.password = password;
    payload.oldPassword = oldPassword;
  }

  if (Object.keys(payload).length === 0) {
    ElMessage.warning("请至少修改一个字段");
    return;
  }

  profileSubmitting.value = true;
  try {
    await updateUserProfile(payload);
    await g.fetchUserInfo();
    ElMessage.success("用户信息已更新");
    profileDialogVisible.value = false;
  } catch {
    // global error handler already shows message
  } finally {
    profileSubmitting.value = false;
  }
};

const handleLogout = async () => {
  loggingOut.value = true;
  try {
    await logout();
    ElMessage.success("已退出登录");
  } catch {
    // global error handler already shows message
  } finally {
    clearAuthSession();
    g.loggedIn = false;
    g.userInfo = {};
    loggingOut.value = false;
    router.push("/login");
  }
};
</script>

<template>
  <section class="user-card">
    <div class="avatar-wrap">
      <img
        v-if="avatarSrc"
        class="user-avatar"
        :src="avatarSrc"
        alt="User Avatar"
      />
      <div v-else class="user-avatar user-avatar-fallback">
        {{ avatarFallbackText }}
      </div>
    </div>
    <div class="user-name">{{ g.userInfo?.nickname }}</div>
    <div class="user-actions">
      <el-button
        class="profile-btn"
        type="primary"
        plain
        @click="openProfileDialog"
      >
        修改资料
      </el-button>
      <el-button
        class="logout-btn"
        type="danger"
        plain
        :loading="loggingOut"
        @click="handleLogout"
      >
        退出登录
      </el-button>
    </div>

    <div class="chips">
      <div class="chip">年龄 {{ age }} 岁</div>
      <div class="chip">本周积分 {{ g.weeklyTotalPoints }}</div>
      <div class="chip">近一周态度分 {{ weekAttitudePoints }}</div>
      <div class="chip">额外积分 {{ g.totalExtraPoints }}</div>
    </div>
    <div class="level-progress">
      <div class="level-progress-head">
        <button
          class="level-trigger"
          type="button"
          @click="showLevelPanel = !showLevelPanel"
        >
          等级 {{ getLevelIcon(levelMeta.level) }} LV.{{ levelMeta.level }}
          {{ levelMeta.title }}
        </button>
        <span>{{ g.totalScore }}/{{ levelTargetPoints }}</span>
      </div>
      <div class="level-progress-track">
        <div
          class="level-progress-fill"
          :style="{ width: `${levelProgressPercent}%` }"
        ></div>
      </div>
    </div>
    <div v-if="showLevelPanel" class="level-panel">
      <div class="level-list">
        <div
          v-for="item in levelList"
          :key="item.level"
          :class="['level-item', { current: item.level === levelMeta.level }]"
        >
          <div class="level-item-title">
            {{ getLevelIcon(item.level) }} LV.{{ item.level }} {{ item.title }}
          </div>
          <div class="level-item-target">{{ item.targetText }}</div>
        </div>
      </div>
    </div>
    <div class="point-stats">
      <div class="point-item">
        <span class="point-label">总积分</span>
        <strong class="point-value">{{ g.totalScore }}</strong>
      </div>
      <div class="point-item">
        <span class="point-label">已消耗</span>
        <strong class="point-value">{{ g.totalConsumedPoints }}</strong>
      </div>
      <div class="point-item">
        <span class="point-label">可用积分</span>
        <strong class="point-value">{{ g.availablePoints }}</strong>
      </div>
    </div>

    <el-dialog
      v-model="profileDialogVisible"
      title="修改用户信息"
      width="520px"
      align-center
      append-to-body
      class="profile-dialog"
      @closed="syncProfileForm"
    >
      <div class="profile-form">
        <div class="profile-grid">
          <div class="profile-field profile-field-full">
            <label class="field-label" for="profile-nickname">昵称</label>
            <el-input
              id="profile-nickname"
              v-model="profileForm.nickname"
              name="nickname"
              class="profile-input"
              placeholder="可选，不填则不修改"
              maxlength="32"
              clearable
            />
          </div>
          <div class="profile-field profile-field-full">
            <label class="field-label">头像</label>
            <div class="avatar-upload-box">
              <img
                v-if="profileAvatarPreview"
                class="avatar-preview"
                :src="profileAvatarPreview"
                alt="头像预览"
              />
              <div v-else class="avatar-preview avatar-preview-fallback">
                {{ avatarFallbackText }}
              </div>
              <div class="avatar-upload-actions">
                <el-button class="btn-cancel avatar-upload-btn" @click="triggerAvatarUpload">
                  选择图片
                </el-button>
                <el-button
                  class="btn-cancel avatar-upload-btn"
                  :disabled="!profileForm.avatar"
                  @click="profileForm.avatar = ''"
                >
                  清除
                </el-button>
                <span class="avatar-upload-tip">
                  选择后可裁剪上传，不填则不修改
                </span>
              </div>
              <input
                ref="avatarFileInput"
                class="avatar-file-input"
                type="file"
                accept="image/*"
                @change="handleAvatarFileChange"
              />
            </div>
          </div>
          <div class="profile-field">
            <label class="field-label" for="profile-birth-date">出生日期</label>
            <el-date-picker
              id="profile-birth-date"
              v-model="profileForm.birthDate"
              name="birthDate"
              class="profile-input profile-input-date"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="可选，不填则不修改"
              :disabled-date="disabledBirthDate"
              clearable
            />
          </div>
          <div class="profile-field">
            <label class="field-label" for="profile-gender">性别</label>
            <el-select
              id="profile-gender"
              v-model="profileForm.gender"
              name="gender"
              class="profile-input"
              placeholder="可选，不填则不修改"
              clearable
            >
              <el-option
                v-for="item in genderOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </div>
          <div class="profile-field profile-field-full">
            <label class="field-label" for="profile-old-password">旧密码</label>
            <el-input
              id="profile-old-password"
              v-model="profileForm.oldPassword"
              name="oldPassword"
              class="profile-input"
              type="password"
              placeholder="修改密码时填写"
              show-password
              clearable
            />
          </div>
          <div class="profile-field profile-field-full">
            <label class="field-label" for="profile-password">新密码</label>
            <el-input
              id="profile-password"
              v-model="profileForm.password"
              name="password"
              class="profile-input"
              type="password"
              placeholder="可选，不修改可留空"
              show-password
              clearable
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="profile-dialog-footer">
          <el-button class="btn-cancel" @click="closeProfileDialog">
            取消
          </el-button>
          <el-button
            class="btn-confirm"
            type="primary"
            :loading="profileSubmitting"
            @click="handleSaveProfile"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="avatarCropDialogVisible"
      title="裁剪头像"
      width="560px"
      align-center
      append-to-body
      class="avatar-crop-dialog"
      @closed="resetAvatarCropState"
    >
      <div class="avatar-crop-body">
        <div
          class="avatar-crop-box"
          @pointerdown="handleCropPointerDown"
          @pointermove="handleCropPointerMove"
          @pointerup="handleCropPointerUp"
          @pointercancel="handleCropPointerUp"
          @pointerleave="handleCropPointerUp"
        >
          <img
            v-if="cropImageSource"
            class="avatar-crop-image"
            :src="cropImageSource"
            alt="裁剪图片"
            :style="{
              width: `${cropDisplaySize.width}px`,
              height: `${cropDisplaySize.height}px`,
              transform: `translate(${cropState.x}px, ${cropState.y}px)`,
            }"
            draggable="false"
          />
          <div class="avatar-crop-grid"></div>
        </div>
        <div class="avatar-crop-zoom">
          <span>缩放</span>
          <el-slider
            v-model="cropZoom"
            :min="1"
            :max="CROP_MAX_ZOOM"
            :step="0.01"
            :show-tooltip="false"
          />
        </div>
      </div>
      <template #footer>
        <div class="avatar-crop-footer">
          <el-button class="btn-cancel" @click="cancelAvatarCrop">
            取消
          </el-button>
          <el-button class="btn-confirm" type="primary" @click="applyCropToAvatar">
            确认裁剪
          </el-button>
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="less">
.user-card {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 20px 18px 18px;
  border-radius: 24px;
  text-align: center;
  background: var(--user-card-bg);
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(128%);
  -webkit-backdrop-filter: blur(16px) saturate(128%);
  box-shadow: 0 16px 36px rgba(120, 88, 20, 0.16);
}

.avatar-wrap {
  width: 150px;
  height: 150px;
  margin: 0 auto;
  border-radius: 999px;
  padding: 5px;
  background: conic-gradient(from 0deg, #ffd66b, #ff9ce8, #8ad8ff, #ffd66b);
  animation: spinHalo 5s linear infinite;
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #fffef5;
}

.user-avatar-fallback,
.avatar-preview-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 42px;
  font-weight: 800;
  text-transform: uppercase;
  background: linear-gradient(135deg, var(--main-accent), var(--sub-accent));
}

.user-name {
  margin-top: 12px;
  font-weight: 800;
  font-size: 34px;
  letter-spacing: 1px;
  color: transparent;
  background: linear-gradient(
    90deg,
    var(--main-accent),
    var(--sub-accent) 55%,
    #00a4ff
  );
  background-clip: text;
  -webkit-background-clip: text;
}

.user-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.profile-btn,
.logout-btn {
  min-width: 112px;
  border-radius: 999px;
}

.profile-btn {
  border-color: color-mix(in srgb, var(--main-accent) 35%, #ffffff);
  color: var(--main-accent);
}

.chips {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.level-progress {
  margin: 14px auto 0;
  width: min(520px, 96%);
  text-align: left;
}

.point-stats {
  margin: 12px auto 0;
  width: min(620px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.point-item {
  padding: 10px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.point-label {
  font-size: 12px;
  color: #7a6335;
  font-weight: 600;
}

.point-value {
  font-size: 24px;
  color: #4d3c16;
  line-height: 1;
}

.profile-form {
  padding: 2px 0 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-field {
  display: grid;
  gap: 6px;
  text-align: left;
}

.profile-field-full {
  grid-column: 1 / -1;
}

.avatar-upload-box {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 247, 236, 0.72);
  border: 1px solid rgba(255, 189, 144, 0.38);
}

.avatar-upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.avatar-preview {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 20px rgba(120, 88, 20, 0.14);
  background: rgba(255, 255, 255, 0.88);
}

.avatar-preview-fallback {
  font-size: 28px;
}

.avatar-upload-btn {
  min-width: 104px;
}

.avatar-upload-tip {
  font-size: 12px;
  color: rgba(49, 73, 117, 0.72);
}

.avatar-file-input {
  display: none;
}

:global(.avatar-crop-dialog.el-dialog) {
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px) saturate(128%);
  -webkit-backdrop-filter: blur(16px) saturate(128%);
  box-shadow: 0 18px 40px rgba(120, 88, 20, 0.18);
}

:global(.avatar-crop-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 20px 22px 0;
}

:global(.avatar-crop-dialog .el-dialog__title) {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #2f4676;
}

:global(.avatar-crop-dialog .el-dialog__body) {
  padding: 10px 22px 8px;
}

:global(.avatar-crop-dialog .el-dialog__footer) {
  padding: 8px 22px 22px;
}

.avatar-crop-body {
  display: grid;
  gap: 14px;
}

.avatar-crop-box {
  position: relative;
  width: 320px;
  height: 320px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(250, 241, 230, 0.92));
  border: 1px solid rgba(255, 189, 144, 0.36);
  box-shadow: 0 12px 24px rgba(120, 88, 20, 0.14);
  touch-action: none;
  user-select: none;
  cursor: move;
}

.avatar-crop-image {
  position: absolute;
  left: 0;
  top: 0;
  max-width: none;
  max-height: none;
  object-fit: cover;
  transform-origin: top left;
  pointer-events: none;
}

.avatar-crop-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(255, 255, 255, 0) 33.333%, rgba(255, 255, 255, 0.28) 33.333%, rgba(255, 255, 255, 0.28) 34%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(to bottom, rgba(255, 255, 255, 0) 33.333%, rgba(255, 255, 255, 0.28) 33.333%, rgba(255, 255, 255, 0.28) 34%, rgba(255, 255, 255, 0) 34%);
  background-size: 100% 100%;
  pointer-events: none;
}

.avatar-crop-zoom {
  display: grid;
  gap: 8px;
  align-items: center;
  grid-template-columns: auto 1fr;
  color: #4d5f87;
  font-size: 13px;
  font-weight: 700;
}

:global(.avatar-crop-dialog .el-slider__bar) {
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
}

:global(.avatar-crop-dialog .el-slider__button) {
  border: 2px solid #fff;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
}

.avatar-crop-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.profile-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:global(.profile-dialog.el-dialog) {
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(128%);
  -webkit-backdrop-filter: blur(16px) saturate(128%);
  box-shadow: 0 18px 40px rgba(120, 88, 20, 0.18);
}

:global(.profile-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 20px 22px 0;
}

:global(.profile-dialog .el-dialog__title) {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #2f4676;
}

:global(.profile-dialog .el-dialog__body) {
  padding: 8px 20px 10px;
}

:global(.profile-dialog .el-dialog__footer) {
  padding: 8px 20px 18px;
}

:global(.profile-dialog .el-input) {
  width: 100%;
  max-width: 280px;
}

:global(.profile-dialog .el-date-editor.el-input) {
  width: 100%;
  max-width: 280px;
}

:global(.profile-dialog .el-input .el-input__wrapper),
:global(.profile-dialog .el-date-editor .el-input__wrapper),
:global(.profile-dialog .el-select .el-select__wrapper) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.86),
    0 0 0 3px color-mix(in srgb, var(--main-accent) 16%, transparent);
}

:global(.profile-dialog .el-date-editor .el-input__inner) {
  font-weight: 700;
  color: #2a3f68;
}

:global(.profile-dialog .el-select .el-select__placeholder),
:global(.profile-dialog .el-date-editor .el-input__inner::placeholder),
:global(.profile-dialog .el-input .el-input__inner::placeholder) {
  color: #8a95b0;
}

:global(.profile-dialog .btn-cancel.el-button),
:global(.profile-dialog .btn-confirm.el-button) {
  border-radius: 999px;
  padding: 9px 18px;
  font-weight: 700;
}

:global(.profile-dialog .btn-cancel.el-button) {
  border: 1px solid rgba(255, 255, 255, 0.78);
  color: #57648a;
  background: rgba(255, 255, 255, 0.68);
}

:global(.profile-dialog .btn-cancel.el-button:hover) {
  color: #32476f;
  border-color: rgba(255, 255, 255, 0.94);
}

:global(.profile-dialog .btn-confirm.el-button) {
  border: 0;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  box-shadow: 0 8px 16px color-mix(in srgb, var(--sub-accent) 32%, transparent);
}

:global(.profile-dialog .btn-confirm.el-button:hover) {
  opacity: 0.94;
  transform: translateY(-1px);
}

:global(.profile-dialog .el-button) {
  border-radius: 12px;
}

.level-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: #5e4a20;
}

.level-trigger {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  padding: 0;
}

.level-trigger:hover {
  color: var(--sub-accent);
}

.level-progress-track {
  margin-top: 8px;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.45);
}

.level-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffd54f 0%, #ff8a5b 45%, #58c8ff 100%);
  box-shadow: 0 0 10px rgba(88, 200, 255, 0.35);
  transition: width 0.35s ease;
}

.chip {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  color: #5e4a20;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.level-list {
  max-height: 200px;
  overflow-y: auto;
  display: grid;
  gap: 8px;
  padding-right: 4px;
}

.level-panel {
  margin: 10px auto 0;
  width: min(520px, 96%);
  text-align: left;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.52);
}

.level-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.7);
}

.level-item.current {
  border-color: var(--sub-accent);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--sub-accent) 30%, transparent);
}

.level-item-title {
  font-size: 14px;
  font-weight: 800;
  color: #3e4f78;
}

.level-item-target {
  margin-top: 4px;
  font-size: 12px;
  color: #5e6e92;
}

@keyframes spinHalo {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .user-card {
    padding: 16px 12px 14px;
    border-radius: 20px;
  }

  .avatar-wrap {
    width: 124px;
    height: 124px;
  }

  .user-name {
    font-size: 28px;
  }

  .point-stats {
    grid-template-columns: 1fr;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-dialog-footer {
    flex-direction: column;
  }

  .profile-dialog-footer :deep(.el-button) {
    flex: 1;
  }
}
</style>
