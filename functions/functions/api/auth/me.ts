export async function onRequestGet(context) {
  const cookie = context.request.headers.get("Cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) {
    return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
  }
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT id, email, name, picture FROM users WHERE id = ?"
    ).bind(match[1]).all();
    if (!results?.[0]) {
      return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ authenticated: true, user: results[0] }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ authenticated: false }), { headers: { "Content-Type": "application/json" } });
  }
}
