import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );

  const sessionId = cookies.session;
  const userId = cookies.user_id;

  if (!sessionId || !userId) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        credits: true,
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        credits: user.credits,
      },
    });
  } catch (err) {
    console.error("Database error:", err);
    // 如果数据库出错，仍然返回 cookie 中的信息
    return NextResponse.json({
      authenticated: true,
      user: {
        email: cookies.user_email,
        name: cookies.user_name,
        picture: cookies.user_picture,
      },
    });
  }
}
