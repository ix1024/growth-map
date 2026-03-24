<template>
  <Teleport to="body">
    <div class="loading-layer">
      <div class="loading-core">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
        <div class="dot dot-1"></div>
        <div class="dot dot-2"></div>
        <div class="dot dot-3"></div>
      </div>
      <p class="loading-text">魔法加载中...</p>
    </div>
  </Teleport>
</template>

<style scoped lang="less">
.loading-layer {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  background: rgba(18, 24, 42, 0.28);
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
}

.loading-core {
  position: relative;
  width: 110px;
  height: 110px;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
}

.ring-1 {
  border-top-color: var(--main-accent);
  animation: spin 0.9s linear infinite;
}

.ring-2 {
  inset: 10px;
  border-right-color: var(--sub-accent);
  animation: spin-rev 1.3s linear infinite;
}

.ring-3 {
  inset: 22px;
  border-bottom-color: #5ad0ff;
  animation: spin 1.8s linear infinite;
}

.dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
}

.dot-1 {
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
}

.dot-2 {
  right: 14px;
  bottom: 24px;
}

.dot-3 {
  left: 16px;
  bottom: 18px;
}

.loading-text {
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  color: #fff;
  font-size: 14px;
  letter-spacing: 1px;
  background: linear-gradient(90deg, var(--main-accent), var(--sub-accent));
  box-shadow: 0 10px 20px color-mix(in srgb, var(--sub-accent) 32%, transparent);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-rev {
  to {
    transform: rotate(-360deg);
  }
}
</style>
