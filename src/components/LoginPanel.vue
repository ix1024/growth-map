<script setup lang="ts">
import { ElMessage } from "element-plus";
import { login } from "@/api/auth";
import { saveLoginSession } from "@/utils/authSession";
import { useGStore } from "@/stores/global";
import { router } from "@/router";
import { useRoute } from "vue-router";
const g = useGStore();
const route = useRoute();
const emit = defineEmits<{
  success: [];
}>();

const form = reactive({
  username: "",
  password: "",
});
const submitting = ref(false);

if (typeof route.query.username === "string") {
  form.username = route.query.username;
}

const handleLogin = async () => {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }
  submitting.value = true;
  try {
    const result = await login({
      username: form.username.trim(),
      password: form.password,
    });
    saveLoginSession(result);
    await g.checkAuthStatus();
    ElMessage.success("登录成功");
    router.push("/");
    emit("success");
  } catch {
    // global error handler already shows message
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="login-page">
    <div class="login-card">
      <h1>成长地图登录</h1>
      <label class="field-label" for="login-username">用户名</label>
      <el-input
        id="login-username"
        name="username"
        v-model="form.username"
        placeholder="用户名"
        size="large"
        clearable
      />
      <label class="field-label" for="login-password">密码</label>
      <el-input
        id="login-password"
        name="password"
        v-model="form.password"
        type="password"
        placeholder="密码"
        size="large"
        show-password
        @keyup.enter="handleLogin"
      />
      <el-button
        class="login-btn"
        type="primary"
        size="large"
        :loading="submitting"
        @click="handleLogin"
      >
        登录
      </el-button>
      <div class="login-footer">
        <span>还没有账号？</span>
        <router-link class="register-link" to="/register">
          去注册
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.login-card {
  width: min(420px, 100%);
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(16px) saturate(126%);
  -webkit-backdrop-filter: blur(16px) saturate(126%);
  box-shadow: 0 16px 34px rgba(58, 67, 114, 0.18);
}

.login-card h1 {
  margin: 0 0 6px;
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

.login-btn {
  margin-top: 4px;
  border-radius: 12px;
  border: 0;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 14px;
  color: rgba(49, 73, 117, 0.78);
}

.register-link {
  color: var(--main-accent);
  font-weight: 700;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
