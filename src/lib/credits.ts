// 积分管理模块 - 使用 Cloudflare D1 数据库

// 获取用户积分（首次访问返回默认值 3）
export async function getCredits(userId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: "SELECT credits FROM user_credits WHERE user_id = ?",
          params: [userId],
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.results?.[0]?.results?.[0]?.credits !== undefined) {
      return data.results[0].results[0].credits;
    }
    return null; // 用户不存在
  } catch {
    return null;
  }
}

// 扣除积分（用于处理图片）
export async function deductCredits(userId: string, amount: number = 1): Promise<boolean> {
  try {
    // 先检查积分是否足够
    const current = await getCredits(userId);
    if (current === null) return false; // 用户不存在
    if (current < amount) return false; // 积分不足

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql: "UPDATE user_credits SET credits = credits - ? WHERE user_id = ?",
          params: [amount, userId],
        }),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

// 添加积分（用于充值）
export async function addCredits(userId: string, amount: number): Promise<boolean> {
  try {
    // 先检查用户是否存在
    const current = await getCredits(userId);

    let response: Response;
    if (current === null) {
      // 新用户，插入记录
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: "INSERT INTO user_credits (user_id, credits) VALUES (?, ?)",
            params: [userId, amount],
          }),
        }
      );
    } else {
      // 老用户，更新积分
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sql: "UPDATE user_credits SET credits = credits + ? WHERE user_id = ?",
            params: [amount, userId],
          }),
        }
      );
    }

    return response.ok;
  } catch {
    return false;
  }
}

// 确保用户有初始积分（首次登录赠送）
export async function ensureInitialCredits(userId: string): Promise<void> {
  const current = await getCredits(userId);
  if (current === null) {
    await addCredits(userId, 3); // 首次登录赠送 3 积分
  }
}
