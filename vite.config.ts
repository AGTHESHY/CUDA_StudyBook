import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      "/store-api": {
        target: "http://38.92.15.80:3021",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/store-api/, ""),
      },
      "/llm-api": {
        target: "http://127.0.0.1:3038",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-api/, ""),
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
