import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CALLBACK_URL = "https://remove-bakg-img.bond/api/auth/callback";
const DB_ID = process.env.D1_DB_ID!;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

async function queryDB(sql: string, params: any[] = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message);
  return data.result;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response("Auth failed: " + (error || "no code"), { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: CALLBACK_URL,
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return new Response("Token error", { status: 400 });
  }

  // Get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();

  // Store user in D1
  const now = Date.now();
  const userId = crypto.randomUUID();
  try {
    await queryDB(
      `INSERT INTO users (id, google_id, email, name, picture, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(google_id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture, last_login=excluded.last_login`,
      [userId, userInfo.id, userInfo.email, userInfo.name || "", userInfo.picture || "", now, now]
    );
  } catch (e) {
    console.error("DB error:", e);
  }

  // Get stored user id
  let sessionId = userId;
  try {
    const users = await queryDB("SELECT id FROM users WHERE google_id = ?", [userInfo.id]);
    if (users?.[0]) sessionId = users[0].id;
  } catch (e) {
    console.error("Session error:", e);
  }

  // Redirect to home with session cookie
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
