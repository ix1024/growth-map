<script setup lang="ts">
import { ElMessage } from "element-plus";
import { getCaptcha, register } from "@/api/auth";
import { router } from "@/router";

const form = reactive({
  username: "",
  password: "",
  captchaId: "",
  captchaCode: "",
  nickname: "",
});
const submitting = ref(false);
const captchaLoading = ref(false);
const captchaImage = ref("");

const loadCaptcha = async () => {
  captchaLoading.value = true;
  try {
    const result = await getCaptcha();
    form.captchaId = result.captchaId;
    form.captchaCode = "";
    captchaImage.value = result.captchaImage;
    if (!result.captchaId) {
      ElMessage.warning("验证码ID未返回，请检查后端接口");
    }
    if (!result.captchaImage) {
      ElMessage.warning("验证码图片未返回，请检查后端接口");
    }
  } catch {
    captchaImage.value = "";
  } finally {
    captchaLoading.value = false;
  }
};

onMounted(() => {
  void loadCaptcha();
});

const handleRegister = async () => {
  if (
    !form.username.trim() ||
    !form.password ||
    !form.captchaCode.trim() ||
    !form.nickname.trim()
  ) {
    ElMessage.warning("请完整填写注册信息");
    return;
  }

  if (!form.captchaId.trim()) {
    ElMessage.warning("验证码未加载，请刷新后重试");
    return;
  }

  submitting.value = true;
  try {
    await register({
      username: form.username.trim(),
      password: form.password,
      captchaId: form.captchaId.trim(),
      captchaCode: form.captchaCode.trim(),
      nickname: form.nickname.trim(),
    });
    ElMessage.success("注册成功，请登录");
    router.push("/login");
  } catch {
    // global error handler already shows message
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="register-page">
    <div class="register-card">
      <div class="register-badge">创建新账号</div>
      <h1>注册成长地图</h1>
      <p class="register-desc">
        填写用户名、昵称和验证码信息，完成后可直接返回登录页。
      </p>
      <label class="field-label" for="register-username">用户名</label>
      <el-input
        id="register-username"
        name="username"
        v-model="form.username"
        placeholder="用户名"
        size="large"
        clearable
      />

      <label class="field-label" for="register-password">密码</label>
      <el-input
        id="register-password"
        name="password"
        v-model="form.password"
        type="password"
        placeholder="密码"
        size="large"
        show-password
      />
      <label class="field-label" for="register-nickname">昵称</label>
      <el-input
        id="register-nickname"
        name="nickname"
        v-model="form.nickname"
        placeholder="昵称"
        size="large"
        clearable
      />
      <div class="captcha-box">
        <div class="captcha-meta">
          <span class="captcha-label">验证码</span>
        </div>
        <div class="captcha-image-wrap">
          <img
            v-if="captchaImage"
            class="captcha-image"
            :src="captchaImage"
            alt="验证码"
          />
          <div v-else class="captcha-placeholder">
            {{ captchaLoading ? "验证码加载中..." : "暂无验证码" }}
          </div>
          <el-button
            class="captcha-refresh"
            :loading="captchaLoading"
            @click="loadCaptcha"
          >
            刷新
          </el-button>
        </div>
      </div>
      <label class="field-label" for="register-captcha">验证码输入</label>
      <el-input
        id="register-captcha"
        name="captchaCode"
        v-model="form.captchaCode"
        placeholder="验证码"
        size="large"
        clearable
        @keyup.enter="handleRegister"
      />
      <el-button
        class="register-btn"
        type="primary"
        size="large"
        :loading="submitting"
        @click="handleRegister"
      >
        注册
      </el-button>
      <div class="register-footer">
        <span>已有账号？</span>
        <router-link class="login-link" to="/login">去登录</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.register-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.register-card {
  width: min(460px, 100%);
  display: grid;
  gap: 12px;
  padding: 22px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(16px) saturate(126%);
  -webkit-backdrop-filter: blur(16px) saturate(126%);
  box-shadow: 0 18px 36px rgba(58, 67, 114, 0.18);
}

.register-badge {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 123, 55, 0.12);
  color: var(--main-accent);
  font-size: 12px;
  font-weight: 700;
}

.register-card h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  color: #314975;
}

.field-label {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(49, 73, 117, 0.85);
}

.register-desc {
  margin: 0 0 2px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(49, 73, 117, 0.72);
}

.register-btn {
  margin-top: 4px;
  border-radius: 12px;
  border: 0;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
}

.captcha-box {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 247, 236, 0.72);
  border: 1px solid rgba(255, 189, 144, 0.38);
}

.captcha-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(49, 73, 117, 0.74);
}

.captcha-label {
  font-weight: 700;
  color: #314975;
}

.captcha-image-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.captcha-image,
.captcha-placeholder {
  width: 180px;
  height: 56px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 189, 144, 0.38);
  object-fit: contain;
}

.captcha-placeholder {
  color: rgba(49, 73, 117, 0.64);
  font-size: 13px;
}

.captcha-refresh {
  border-radius: 12px;
  border: 0;
  flex: 0 0 auto;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  color: #fff;
}

.register-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 14px;
  color: rgba(49, 73, 117, 0.78);
}

.login-link {
  color: var(--main-accent);
  font-weight: 700;
  text-decoration: none;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
