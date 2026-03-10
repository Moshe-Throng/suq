import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "suq_admin";
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
const LOGIN_TTL = 5 * 60; // 5 minutes
const MAGIC_LINK_TTL = 15 * 60; // 15 minutes

interface AdminSession {
  tid: number; // telegram_id
  sid: string; // shop_id
  slug: string; // shop_slug
}

function getSecret() {
  const secret = process.env.BOT_TOKEN;
  if (!secret) throw new Error("BOT_TOKEN not set");
  return new TextEncoder().encode(secret);
}

/** Sign a session JWT (set in cookie after login) */
export async function signSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT({ tid: session.tid, sid: session.sid, slug: session.slug })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL}s`)
    .setIssuedAt()
    .sign(getSecret());
}

/** Verify any HMAC-SHA256 token signed with BOT_TOKEN */
async function verifyToken(token: string): Promise<JWTPayload & Partial<AdminSession>> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as JWTPayload & Partial<AdminSession>;
}

/** Sign a short-lived login token (bot generates this for "Manage on Web" URL) */
export async function signLoginToken(session: AdminSession): Promise<string> {
  return new SignJWT({ tid: session.tid, sid: session.sid, slug: session.slug, purpose: "login" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${LOGIN_TTL}s`)
    .setIssuedAt()
    .sign(getSecret());
}

/** Sign a magic link token for email login */
export async function signMagicLinkToken(email: string, shopId: string, slug: string): Promise<string> {
  return new SignJWT({ email, sid: shopId, slug, purpose: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAGIC_LINK_TTL}s`)
    .setIssuedAt()
    .sign(getSecret());
}

/** Verify a login token from the bot */
export async function verifyLoginToken(token: string): Promise<AdminSession> {
  const payload = await verifyToken(token);
  if (!payload.tid || !payload.sid || !payload.slug) {
    throw new Error("Invalid login token");
  }
  return { tid: payload.tid as number, sid: payload.sid as string, slug: payload.slug as string };
}

/** Verify a magic link token */
export async function verifyMagicLinkToken(token: string): Promise<{ email: string; sid: string; slug: string }> {
  const payload = await verifyToken(token);
  const email = (payload as Record<string, unknown>).email as string | undefined;
  if (!email || !payload.sid || !payload.slug) {
    throw new Error("Invalid magic link token");
  }
  return { email, sid: payload.sid as string, slug: payload.slug as string };
}

/** Read the admin session from the cookie (for use in API routes) */
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    const payload = await verifyToken(cookie.value);
    if (!payload.tid || !payload.sid || !payload.slug) return null;
    return { tid: payload.tid as number, sid: payload.sid as string, slug: payload.slug as string };
  } catch {
    return null;
  }
}

/** Set the session cookie on a NextResponse */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });
}

/** Clear the session cookie */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/** Read session from a request's cookies (for route handlers) */
export async function getSessionFromRequest(req: NextRequest): Promise<AdminSession | null> {
  const cookie = req.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    const payload = await verifyToken(cookie.value);
    if (!payload.tid || !payload.sid || !payload.slug) return null;
    return { tid: payload.tid as number, sid: payload.sid as string, slug: payload.slug as string };
  } catch {
    return null;
  }
}
