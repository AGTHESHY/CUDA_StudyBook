# CUDA 52

一份可搜索、可追踪进度的 52 周 CUDA 与大模型 Kernel 工程学习手册。

## 能做什么

- 按 10 个阶段浏览完整 52 周课程；
- 全文搜索周次、算子与性能主题；
- 勾选每周任务、标记完成状态并记录笔记；
- 使用 Test ScriptStore 注册 / 登录并跨设备同步；
- 通过 Three.js GPU 粒子核心呈现课程视觉主题。

## 本地运行

```bash
npm install
npm run dev
```

默认通过 Vite 将 `/store-api` 代理到 `http://38.92.15.80:3021`。

## 验证

```bash
npm run build
npm test
```

构建时会从 `content/course.md` 生成完整课程数据，并准备静态站点与 Sites Worker。

## 服务器部署

`deploy/` 包含独立的 Nginx Compose 配置：静态站点发布在 80 端口，
`/store-api/` 反向代理到同一台服务器的 Test ScriptStore `:3021`。
