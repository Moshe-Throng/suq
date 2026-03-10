import { NextRequest, NextResponse } from "next/server";
import { verifyLoginToken, signSessionToken, setSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const session = await verifyLoginToken(token);
    const sessionJwt = await signSessionToken(session);
    const res = NextResponse.redirect(new URL(`/${session.slug}`, req.url));
    setSessionCookie(res, sessionJwt);
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
