# Image Background Remover - MVP 需求文档

> 版本：v1.0  
> 日期：2026-04-07  
> 负责人：高旭光

---

## 1. 项目概述

| 项目 | 内容 |
|------|------|
| **项目名称** | Image Background Remover |
| **核心功能** | 一键移除图片背景，下载透明PNG或自定义背景图 |
| **目标用户** | 需要快速抠图的设计师、电商卖家、内容创作者 |
| **上线地址** | `remove-bakg-img.cfd`（待确认） |
| **技术栈** | Cloudflare Pages（静态托管）+ Remove.bg API + PayPal |
| **成本模型** | 无持久化存储，纯内存处理，API按调用计费 |

---

## 2. 功能需求

### 2.1 核心功能（Must Have）

#### F1: 图片上传
- 支持拖拽上传 + 点击选择
- 支持格式：JPG, PNG, WebP
- 文件大小限制：≤10MB
- 前端预览原图

#### F2: 背景移除处理
- 调用 Remove.bg API 完成处理
- 显示处理进度（loading状态）
- 处理完成后显示透明背景预览

#### F3: 结果对比展示
- 左右对比滑块（原图 vs 去除背景）
- 支持拖动滑块查看前后对比

#### F4: 下载功能
- 下载透明背景PNG
- 下载白底JPG（可选）
- 下载自定义背景色JPG（颜色选择器）

#### F5: 积分系统
- 用户余额管理（sessionStorage）
- 每次处理消耗1积分
- 积分不足时提示充值

#### F6: PayPal 支付
- 积分包购买（参考 Image-enlargement 项目）
- 沙盒环境测试
- 支付后即时到账

### 2.2 次要功能（Should Have）

#### F7: 历史记录
- 最近处理记录（当前会话内）
- 快速重新下载

#### F8: 多图批量处理（后续版本）

---

## 3. 积分与定价

### 3.1 积分包

| 积分包 | 价格 | 单张成本 |
|--------|------|----------|
| 10 积分 | $0.99 | $0.099/张 |
| 50 积分 | $3.99 | $0.080/张 |
| 100 积分 | $6.99 | $0.070/张 |
| 500 积分 | $29.99 | $0.060/张 |

### 3.2 免费试用
- 新用户赠送 3 积分（仅首次）

### 3.3 API成本
- Remove.bg 定价：$0.079/张（量大可协商）

---

## 4. 技术架构

### 4.1 前端架构

```
/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── app.js          # 主逻辑
│   ├── api.js          # Remove.bg API 调用
│   └── paypal.js       # PayPal 集成
└── assets/
    └── icons/          # UI图标
```

### 4.2 Remove.bg API 集成

```javascript
// API 调用示例
POST https://api.remove.bg/v1.0/removebg
Headers: {
  "X-Api-Key": "YOUR_API_KEY"
}
FormData: {
  image_file: File,
  size: "auto"
}
Response: {
  // 返回透明背景PNG
}
```

### 4.3 PayPal 集成（复用现有方案）

- 参考 `Image-enlargement-and-enhancement` 项目
- 使用 PayPal JS SDK
- Webhook 确认支付（可选，沙盒环境可跳过）
- 直接查询订单状态发放积分

### 4.4 环境变量

| 变量 | 说明 |
|------|------|
| `REMOVE_BG_API_KEY` | Remove.bg API Key |
| `PAYPAL_CLIENT_ID` | PayPal Client ID |

---

## 5. UI/UX 设计

### 5.1 页面结构

```
┌─────────────────────────────────────────────────┐
│  Logo + 积分余额 [充值]                          │
├─────────────────────────────────────────────────┤
│                                                 │
│     ┌─────────────────────────────────┐         │
│     │                                 │         │
│     │     上传区域 / 预览区域          │         │
│     │     (支持拖拽 + 点击上传)        │         │
│     │                                 │         │
│     └─────────────────────────────────┘         │
│                                                 │
│     [处理中: ████████░░ 80%]                    │
│                                                 │
│     ┌───────────┬───────────┐                   │
│     │   原图    │  滑块对比  │  [下载PNG][下载JPG]│
│     └───────────┴───────────┘                   │
│                                                 │
├─────────────────────────────────────────────────┤
│  支付弹窗（选择积分包）                          │
└─────────────────────────────────────────────────┘
```

### 5.2 设计风格

- 简约现代，参考 remove.bg
- 强调主操作（上传和处理）
- 深色/浅色模式可选（可选）

---

## 6. 部署方案

| 项目 | 决策 |
|------|------|
| **托管平台** | Cloudflare Pages |
| **构建输出** | 纯静态文件（index.html + css + js） |
| **部署方式** | GitHub Actions 自动部署 |
| **自定义域名** | `remove-bakg-img.cfd`（待确认） |

### 6.1 GitHub Actions 配置

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          directory: '.'
```

---

## 7. 风险与备选方案

| 风险 | 应对方案 |
|------|----------|
| Remove.bg API 不可用 | 降级到 @imgly/background-removal（纯前端，需加载模型） |
| PayPal 支付失败 | 提示用户检查账户，提供客服邮箱 |
| 图片上传过大 | 前端限制 10MB，超出提示压缩 |
| API Key 泄露 | 放到 Cloudflare Pages 环境变量，不在前端暴露 |

---

## 8. TODO List

- [ ] 注册 Remove.bg 账号，获取 API Key
- [ ] 创建 GitHub 仓库
- [ ] 搭建项目结构（HTML/CSS/JS）
- [ ] 实现图片上传和预览
- [ ] 集成 Remove.bg API
- [ ] 实现对比滑块组件
- [ ] 实现下载功能
- [ ] 集成 PayPal 支付（复用 Image-enlargement 方案）
- [ ] 配置 GitHub Actions 自动部署
- [ ] 配置自定义域名
- [ ] 沙盒环境测试
- [ ] 正式上线

---

## 9. 附录

### 9.1 Remove.bg 免费额度
- 免费套餐：50张/月
- 注册地址：https://www.remove.bg/api

### 9.2 参考项目
- Image-enlargement-and-enhancement（PayPal 集成参考）
- BatchRename（GitHub Actions 部署参考）
