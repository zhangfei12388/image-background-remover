import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

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

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const users = await queryDB(
      "SELECT id, email, name, picture FROM users WHERE id = ?",
      [sessionId]
    );
    if (!users?.[0]) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, user: users[0] });
  } catch (e) {
    console.error("Auth check error:", e);
    return NextResponse.json({ authenticated: false });
  }
}
