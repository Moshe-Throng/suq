import { NextRequest, NextResponse } from "next/server";
import { signMagicLinkToken } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data: shop } = await supabase
    .from("suq_shops")
    .select("id, shop_slug, shop_name")
    .ilike("email", email.trim())
    .single();

  if (!shop) {
    // Don't reveal whether the email exists — always return success
    return NextResponse.json({ success: true });
  }

  const token = await signMagicLinkToken(email.trim().toLowerCase(), shop.id, shop.shop_slug);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://web-theta-plum-56.vercel.app";
  const loginUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  // Send email via Gmail SMTP
  const gmailUser = process.env.GMAIL_USER || "souketeam@gmail.com";
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailPass) {
    console.error("GMAIL_APP_PASSWORD not set — cannot send magic link");
    return NextResponse.json({ success: true });
  }

  // Use a lightweight email approach via fetch to Gmail SMTP relay
  // For production, use nodemailer or Resend. For now, we'll use a simple approach.
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"souk.et" <${gmailUser}>`,
      to: email.trim(),
      subject: `Log in to manage ${shop.shop_name} on souk.et`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin:0 0 8px">Log in to souk.et</h2>
          <p style="color:#666;margin:0 0 24px">Click the button below to manage <strong>${shop.shop_name}</strong>. This link expires in 15 minutes.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Log in to my shop</a>
          <p style="color:#999;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Failed to send magic link email:", e);
  }

  return NextResponse.json({ success: true });
}
