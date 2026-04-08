import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";

// PayPal 积分包配置（与 paypal/route.ts 保持一致）
const CREDIT_PACKAGES: Record<string, number> = {
  "10-credits": 10,
  "50-credits": 50,
  "100-credits": 100,
  "500-credits": 500,
};

// POST - PayPal 支付成功后调用此接口发放积分
export async function POST(request: Request) {
  try {
    const { orderId, packageId } = await request.json();

    if (!orderId || !packageId) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const credits = CREDIT_PACKAGES[packageId];
    if (!credits) {
      return NextResponse.json({ error: "无效的套餐" }, { status: 400 });
    }

    // 获取用户 session
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...val] = c.trim().split("=");
        return [key, val.join("=")];
      })
    );

    const userId = cookies.session;
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 验证 PayPal 订单状态
    const isSandbox = !!process.env.PAYPAL_SANDBOX_CLIENT_ID;
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;

    const verifyResponse = await fetch(
      `${isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${await getPayPalAccessToken(isSandbox, PAYPAL_CLIENT_ID!)}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: "订单验证失败" }, { status: 400 });
    }

    const order = await verifyResponse.json();
    if (order.status !== "COMPLETED") {
      return NextResponse.json({ error: "订单未完成", status: order.status });
    }

    // 发放积分
    const success = await addCredits(userId, credits);
    if (!success) {
      return NextResponse.json({ error: "积分发放失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true, credits });
  } catch (error) {
    console.error("PayPal Callback Error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

async function getPayPalAccessToken(isSandbox: boolean, clientId: string): Promise<string> {
  const response = await fetch(
    isSandbox
      ? "https://api-m.sandbox.paypal.com/v1/oauth2/token"
      : "https://api-m.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${isSandbox ? process.env.PAYPAL_SANDBOX_CLIENT_SECRET : process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    }
  );

  const data = await response.json();
  return data.access_token;
}
