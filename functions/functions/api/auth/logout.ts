export async function onRequestGet(context) {
  const response = Response.redirect("https://remove-bakg-img.bond/", 302);
  response.headers.set("Set-Cookie", "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
