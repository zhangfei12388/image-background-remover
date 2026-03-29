/**
 * Cloudflare Pages Function: Google OAuth
 */

export async function onRequestGet(context: { request: Request; env: Env; next: Function }) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const GOOGLE_CLIENT_ID = context.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = context.env.GOOGLE_CLIENT_SECRET;
  const CALLBACK_URL = "https://remove-bakg-img.bond/auth/callback";

  if (path === "/auth/google") {
    const state = crypto.randomUUID();
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", CALLBACK_URL);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "consent");
    return Response.redirect(googleAuthUrl.toString(), 302);
  }

  if (path === "/auth/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error || !code) return new Response("Auth failed", { status: 400 });

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
    if (!tokens.access_token) return new Response("Token error", { status: 400 });

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { "Authorization": `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();

    const now = Date.now();
    const userId = crypto.randomUUID();
    try {
      await context.env.DB.prepare(
        `INSERT INTO users (id, google_id, email, name, picture, created_at, last_login)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(google_id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture, last_login=excluded.last_login`
      ).bind(userId, userInfo.id, userInfo.email, userInfo.name || "", userInfo.picture || "", now, now).run();
    } catch (e) {
      console.error("DB error:", e);
    }

    const { results } = await context.env.DB.prepare("SELECT * FROM users WHERE google_id = ?").bind(userInfo.id).all();
    const user = results?.[0] as any;

    const response = new Response("", { status: 302 });
    response.headers.set("Location", "/auth/me");
    response.headers.set("Set-Cookie", `session=${user?.id || userId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
    return response;
  }

  if (path === "/auth/me") {
    const cookie = context.request.headers.get("Cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    if (!match) {
      return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
    }
    const { results } = await context.env.DB.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").bind(match[1]).all();
    if (!results?.[0]) {
      return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ authenticated: true, user: results[0] }), { headers: { "Content-Type": "application/json" } });
  }

  if (path === "/auth/logout") {
    const response = new Response("", { status: 302 });
    response.headers.set("Location", "/");
    response.headers.set("Set-Cookie", "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    return response;
  }

  return new Response("Not found", { status: 404 });
}

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  DB: any;
  DB_ID: string;
  ACCOUNT_ID: string;
}
