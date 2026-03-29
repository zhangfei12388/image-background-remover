export async function onRequestGet(context) {
  const CALLBACK_URL = "https://remove-bakg-img.bond/api/auth/callback";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", context.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", CALLBACK_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", crypto.randomUUID());
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return Response.redirect(url.toString(), 302);
}
