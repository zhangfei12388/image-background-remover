# 🖼️ 图片背景移除

> 基于 Next.js + Tailwind CSS + Remove.bg API 的图片背景移除工具。

**技术栈：**
- 前端：Next.js 15 (App Router) + Tailwind CSS
- 后端：Next.js API Routes
- AI 能力：Remove.bg API
- 部署：Vercel / Cloudflare Pages

**特点：**
- 拖拽上传，即时预览
- 纯内存处理，不做任何存储
- 移动端适配，深色主题

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入你的 Remove.bg API Key：

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 REMOVE_BG_API_KEY
```

**获取 API Key：** https://www.remove.bg/api

### 3. 本地运行

```bash
npm run dev
```

打开 http://localhost:3000

### 4. 部署到 Vercel

```bash
npm install -g vercel
vercel
```

或连接 GitHub 实现自动部署，然后通过 Vercel Dashboard 配置环境变量 `REMOVE_BG_API_KEY`。

### 4. 部署到 Cloudflare Pages

1. Push 到 GitHub
2. 在 Cloudflare Pages 新建项目，连接 GitHub 仓库
3. 构建命令：`npm run build`，输出目录：`\.next`
4. 在 Pages 设置中添加环境变量 `REMOVE_BG_API_KEY`

---

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── remove-bg/
│   │       └── route.ts    # Remove.bg API 代理
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # 主页面
├── .env.example            # 环境变量示例
├── next.config.ts
├── package.json
└── README.md
```

---

## 限制

| 维度 | 限制 |
|------|------|
| 单文件大小 | ≤ 10MB |
| 支持格式 | JPG / PNG / WebP |
| 免费调用量 | 50次/月（Remove.bg 免费版）|
