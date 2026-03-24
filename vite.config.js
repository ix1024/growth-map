import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import pxtorem from "postcss-pxtorem";
import AutoImport from "unplugin-auto-import/vite";
const apiTarget = process.env.VITE_API_TARGET || "http://localhost:8888";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 8887,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    dedupe: ["vue"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  optimizeDeps: {
    include: ["vue", "element-plus"],
  },
  css: {
    postcss: {
      plugins: [
        pxtorem({
          rootValue: 16,
          propList: ["*"],
          selectorBlackList: ["norem"],
          minPixelValue: 2,
          mediaQuery: false,
          exclude: /node_modules/i,
        }),
      ],
    },
  },
  plugins: [
    VueRouter({
      routesFolder: "src/views",
      extensions: [".vue"],
    }),
    vue(),
    AutoImport({
      imports: ["vue"],
      dts: "src/auto-imports.d.ts",
      vueTemplate: true,
    }),
  ],
});
