import { NextResponse } from "next/server";
import { getCredits } from "@/lib/credits";

// GET - 获取用户积分
export async function GET(request: Request) {
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

  const credits = await getCredits(userId);
  return NextResponse.json({ credits: credits ?? 0 });
}
