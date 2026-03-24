<script setup lang="ts">
import { useGStore } from "./stores/global";
import { router } from "./router";
const globalStore = useGStore();
onMounted(async () => {
  await globalStore.checkAuthStatus();
  if (!globalStore.loggedIn) {
    router.push("/login");
  } else {
    router.push("/");
    globalStore.fetchUserInfo();
  }
});
</script>
<template>
  <router-view />
</template>
