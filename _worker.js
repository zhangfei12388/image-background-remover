/**
 * Standalone Worker for Google OAuth
 * Handles /api/* routes, proxies everything else to Next.js static files
 */

const CALLBACK_URL = "https://remove-bakg-img.bond/api/callback";

async function queryDB(sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${globalThis.ACCOUNT_ID}/d1/database/${globalThis.DB_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${globalThis.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "DB error");
  return data.result;
}

async function handleApi(path, request) {
  if (path === "/api/auth/google" || path === "/api/login") {
    const state = crypto.randomUUID();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", globalThis.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", CALLBACK_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return Response.redirect(url.toString(), 302);
  }

  if (path === "/api/callback") {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error || !code) return new Response("Auth failed: " + (error || "no code"), { status: 400 });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: globalThis.GOOGLE_CLIENT_ID,
        client_secret: globalThis.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK_URL,
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return new Response("Token error", { status: 400 });

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();

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

    let sessionId = userId;
    try {
      const users = await queryDB("SELECT id FROM users WHERE google_id = ?", [userInfo.id]);
      if (users?.[0]) sessionId = users[0].id;
    } catch (e) {}

    const response = Response.redirect("https://remove-bakg-img.bond/", 302);
    response.headers.set("Set-Cookie", `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
    return response;
  }

  if (path === "/api/me") {
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    if (!match) {
      return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
    }
    try {
      const users = await queryDB("SELECT id, email, name, picture FROM users WHERE id = ?", [match[1]]);
      if (!users?.[0]) {
        return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ authenticated: true, user: users[0] }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
    }
  }

  if (path === "/api/logout") {
    const response = Response.redirect("https://remove-bakg-img.bond/", 302);
    response.headers.set("Set-Cookie", "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    return response;
  }

  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/api/")) {
      return handleApi(path, request);
    }

    return fetch(request);
  },
};
