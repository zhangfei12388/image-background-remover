# 🖼️ Image Background Remover

一键移除图片背景，支持透明PNG下载。

## 功能特性

- ✅ 拖拽/点击上传图片
- ✅ AI 自动移除背景（Remove.bg API）
- ✅ 透明PNG下载
- ✅ 积分系统（首次登录赠送3积分）
- ✅ PayPal 支付充值
- ✅ Google 账号登录
- ✅ 纯内存处理，无持久化存储

## 技术栈

- **框架**: Next.js 15 + React 19
- **样式**: Tailwind CSS 4
- **部署**: Cloudflare Pages
- **数据库**: Cloudflare D1
- **AI**: Remove.bg API
- **支付**: PayPal

## 积分包

| 积分 | 价格 | 单张成本 |
|------|------|----------|
| 10 | $0.99 | $0.099/张 |
| 50 | $3.99 | $0.080/张 |
| 100 | $6.99 | $0.070/张 |
| 500 | $29.99 | $0.060/张 |

## 本地开发

```bash
# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际值

# 启动开发服务器
pnpm dev
```

## 环境变量

```env
CLOUDFLARE_ACCOUNT_ID=        # Cloudflare Account ID
DB_ID=                        # Cloudflare D1 Database ID
CLOUDFLARE_API_TOKEN=         # Cloudflare API Token
NEXT_PUBLIC_REMOVE_BG_API_KEY= # Remove.bg API Key
PAYPAL_SANDBOX_CLIENT_ID=     # PayPal SandBox Client ID
PAYPAL_SANDBOX_CLIENT_SECRET= # PayPal SandBox Client Secret
```

## 数据库迁移

```bash
# 运行迁移
wrangler d1 execute image-bg-remover-db --file=migrations/001_create_credits.sql --remote
```

## 部署

推送到 `master` 分支自动触发部署：

```bash
git push origin master
```

## License

MIT
