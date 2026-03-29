export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) return new Response("Auth failed: " + (error || "no code"), { status: 400 });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: context.env.GOOGLE_CLIENT_ID,
      client_secret: context.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: "https://remove-bakg-img.bond/api/auth/callback",
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
    await context.env.DB.prepare(
      `INSERT INTO users (id, google_id, email, name, picture, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(google_id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture, last_login=excluded.last_login`
    ).bind(userId, userInfo.id, userInfo.email, userInfo.name || "", userInfo.picture || "", now, now).run();
  } catch (e) {
    console.error("DB error:", e);
  }

  let sessionId = userId;
  try {
    const { results } = await context.env.DB.prepare("SELECT id FROM users WHERE google_id = ?").bind(userInfo.id).all();
    if (results?.[0]) sessionId = results[0].id;
  } catch (e) {}

  const response = Response.redirect("https://remove-bakg-img.bond/", 302);
  response.headers.set("Set-Cookie", `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`);
  return response;
}
