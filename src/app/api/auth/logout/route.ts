import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const redirectUrl = process.env.NEXTAUTH_URL || "https://image-background-remover-mu.vercel.app";
  const response = NextResponse.redirect(redirectUrl, 302);
  response.cookies.set("session", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_email", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_name", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_picture", "", { path: "/", maxAge: 0 });
  return response;
}
