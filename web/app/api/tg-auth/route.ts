/**
 * Telegram Mini App auth bridge.
 *
 * Verifies Telegram WebApp `initData` HMAC (per Telegram spec) and — if the
 * user owns a shop — mints the same JWT session cookie used by the existing
 * web admin flow. That makes every admin page/API "just work" without
 * needing a magic link.
 *
 * Request body: { initData: string }  // raw initData string from Telegram.WebApp.initData
 * Response:     { role: "seller" | "buyer", slug?: string, tid: number, name?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const MAX_INITDATA_AGE_SECONDS = 24 * 60 * 60; // 24h

function verifyInitData(initData: string, botToken: string): Record<string, string> | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  // data_check_string = sorted "key=value" lines joined by \n
  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // secret_key = HMAC-SHA256(bot_token) keyed by "WebAppData"
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  // Optional: auth_date freshness
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (authDate > 0) {
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age > MAX_INITDATA_AGE_SECONDS) return null;
  }

  const out: Record<string, string> = {};
  params.forEach((v, k) => (out[k] = v));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = await req.json().catch(() => ({ initData: "" }));
    if (!initData) {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    const verified = verifyInitData(initData, BOT_TOKEN);
    if (!verified) {
      return NextResponse.json({ error: "invalid initData" }, { status: 401 });
    }

    let tgUser: { id: number; first_name?: string; username?: string } = { id: 0 };
    try {
      tgUser = JSON.parse(verified.user || "{}");
    } catch {}
    if (!tgUser.id) {
      return NextResponse.json({ error: "no user in initData" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    // Upsert the buyer record (everyone becomes a buyer record regardless of shop)
    await supabase
      .from("suq_tg_members")
      .upsert(
        {
          telegram_id: tgUser.id,
          username: tgUser.username || null,
          first_name: tgUser.first_name || null,
        },
        { onConflict: "telegram_id" }
      );

    // Look up shop ownership
    const { data: shop } = await supabase
      .from("suq_shops")
      .select("id, shop_slug, shop_name")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (shop && shop.id && shop.shop_slug) {
      const jwt = await signSessionToken({
        tid: tgUser.id,
        sid: shop.id,
        slug: shop.shop_slug,
      });
      const res = NextResponse.json({
        role: "seller",
        slug: shop.shop_slug,
        name: shop.shop_name,
        tid: tgUser.id,
      });
      setSessionCookie(res, jwt);
      return res;
    }

    // Buyer — no seller session, but return their identity so the mini-app can greet them
    return NextResponse.json({
      role: "buyer",
      tid: tgUser.id,
      name: tgUser.first_name || tgUser.username || null,
    });
  } catch (err) {
    console.error("tg-auth error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
