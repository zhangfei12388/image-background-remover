import { NextResponse } from "next/server";

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
    : "https://image-background-remover-mu.vercel.app/api/auth/callback";

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

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();

  const sessionId = userInfo.id || crypto.randomUUID();
  const redirectUrl = process.env.NEXTAUTH_URL || "https://image-background-remover-mu.vercel.app";

  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set("session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set("user_email", userInfo.email || "", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set("user_name", userInfo.name || "", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set("user_picture", userInfo.picture || "", { path: "/", maxAge: 60 * 60 * 24 * 30 });

  return response;
}
