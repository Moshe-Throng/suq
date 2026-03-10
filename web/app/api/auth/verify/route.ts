import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLinkToken, signSessionToken, setSessionCookie } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const { email, sid, slug } = await verifyMagicLinkToken(token);

    // Look up the shop to get telegram_id for the session
    const supabase = getServerClient();
    const { data: shop } = await supabase
      .from("suq_shops")
      .select("telegram_id")
      .eq("id", sid)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const sessionJwt = await signSessionToken({
      tid: shop.telegram_id,
      sid,
      slug,
    });

    const res = NextResponse.redirect(new URL(`/${slug}`, req.url));
    setSessionCookie(res, sessionJwt);
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }
}
