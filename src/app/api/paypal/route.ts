import { NextResponse } from "next/server";

// PayPal 积分包配置
const CREDIT_PACKAGES = {
  "10-credits": { credits: 10, price: "0.99" },
  "50-credits": { credits: 50, price: "3.99" },
  "100-credits": { credits: 100, price: "6.99" },
  "500-credits": { credits: 500, price: "29.99" },
} as const;

interface PayPalLink {
  rel: string;
  href: string;
}

interface PayPalOrder {
  id: string;
  links: PayPalLink[];
}

// POST - 创建 PayPal 订单
export async function POST(request: Request) {
  try {
    const { packageId } = await request.json();

    if (!CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]) {
      return NextResponse.json({ error: "无效的套餐" }, { status: 400 });
    }

    const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];

    // 沙盒环境
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const isSandbox = !!process.env.PAYPAL_SANDBOX_CLIENT_ID;

    // 创建 PayPal Order
    const response = await fetch(
      isSandbox
        ? "https://api-m.sandbox.paypal.com/v2/checkout/orders"
        : "https://api-m.paypal.com/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getPayPalAccessToken(isSandbox, PAYPAL_CLIENT_ID!)}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              description: `${pkg.credits} Credits - Image Background Remover`,
              amount: {
                currency_code: "USD",
                value: pkg.price,
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("PayPal API Error:", error);
      return NextResponse.json({ error: "支付创建失败" }, { status: 500 });
    }

    const order: PayPalOrder = await response.json();
    return NextResponse.json({ 
      orderId: order.id, 
      approveUrl: order.links.find((l) => l.rel === "approve")?.href 
    });
  } catch (error) {
    console.error("PayPal Error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// GET - 查询订单状态
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "缺少订单ID" }, { status: 400 });
  }

  const isSandbox = !!process.env.PAYPAL_SANDBOX_CLIENT_ID;
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;

  try {
    const response = await fetch(
      `${isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com"}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${await getPayPalAccessToken(isSandbox, PAYPAL_CLIENT_ID!)}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ status: "ERROR" });
    }

    const order = await response.json();
    return NextResponse.json({ status: order.status });
  } catch {
    return NextResponse.json({ status: "ERROR" });
  }
}

// 获取 Paypal Access Token
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
