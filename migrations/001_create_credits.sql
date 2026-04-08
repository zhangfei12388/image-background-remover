-- 积分表迁移
-- 运行方式: wrangler d1 execute image-bg-remover-db --file=migrations/001_create_credits.sql --remote

CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  credits INTEGER DEFAULT 3 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- 初始积分赠送触发器（新用户自动获得3积分）
-- 注意：首次登录时在代码逻辑中处理
