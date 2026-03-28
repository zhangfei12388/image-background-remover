# 🖼️ 图片背景移除

基于 Remove.bg API + Cloudflare Workers 的图片背景移除工具。

**特点：**
- 纯内存处理，不做任何存储
- 单个 Worker 搞定全部（页面 + API 代理）
- 部署到 Cloudflare 全球边缘节点，访问速度快

---

## 配置

### 1. 获取 Remove.bg API Key

注册 https://www.remove.bg/api 免费版，每月 50 次调用。

### 2. 设置环境变量

```bash
# 方式一：部署时
wrangler secret put REMOVE_BG_API_KEY
# 输入你的 API Key

# 方式二：直接在 wrangler.toml 填（不推荐用于生产）
```

### 3. 安装并部署

```bash
npm install
npx wrangler deploy
```

部署完成后会给你一个 `*.workers.dev` 域名，或者绑定你自己的域名。

---

## 本地开发

```bash
npm install
npx wrangler dev
# 访问 http://localhost:8787
```

本地调试需要先设置 `REMOVE_BG_API_KEY`：

```bash
wrangler secret put REMOVE_BG_API_KEY
npx wrangler dev
```

---

## 项目结构

```
bg-remover/
├── wrangler.toml      # Cloudflare Workers 配置
├── src/
│   └── index.js       # Worker 主逻辑（页面 + API 代理）
└── README.md
```

---

## 已知限制

- Remove.bg 免费版每月 50 次，适合小规模试用
- 图片大小限制：Remove.bg API 最大 10MB
- Cloudflare Workers 免费版请求 body 最大 1MB；付费版最大 100MB

---

## 后续可扩展

- [ ] 接入其他背景移除模型（自托管 U2Net / RMBG-1.4，省 API 费用）
- [ ] 批量处理
- [ ] 历史记录（可选，用户自己保存）
- [ ] 接入 Stripe 付费
