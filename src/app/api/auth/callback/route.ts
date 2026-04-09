import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response("Auth failed: " + (error || "no code"), { status: 400 });
  }

  const callbackUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/callback`
    : "https://remove-img-background.homes/api/auth/callback";

  try {
    // 1. 用授权码换取 Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return new Response("Token error", { status: 400 });
    }

    // 2. 获取用户信息
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();

    // 3. 创建或更新用户
    const user = await prisma.user.upsert({
      where: { googleId: userInfo.id },
      update: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        lastLogin: new Date(),
      },
      create: {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        credits: 100,
      },
    });

    // 4. 生成会话 ID
    const sessionId = `session_${user.id}_${Date.now()}`;

    // 5. 重定向并设置 Cookie
    const redirectUrl = process.env.NEXTAUTH_URL || "https://remove-img-background.homes";
    const response = NextResponse.redirect(redirectUrl, 302);
    
    response.cookies.set("session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("user_id", user.id.toString(), { path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("user_email", user.email, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("user_name", user.name || "", { path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("user_picture", user.picture || "", { path: "/", maxAge: 60 * 60 * 24 * 30 });
    response.cookies.set("credits", user.credits.toString(), { path: "/", maxAge: 60 * 60 * 24 * 30 });

    return response;
  } catch (err) {
    console.error("Auth error:", err);
    return new Response("Auth failed: " + (err instanceof Error ? err.message : "Unknown error"), { status: 500 });
  }
}
