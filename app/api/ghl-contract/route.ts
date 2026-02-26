import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ghlWebhookUrl = process.env.GHL_CONTRACT_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL;

    if (!ghlWebhookUrl) {
      console.warn("No GHL contract webhook URL set");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const res = await fetch(ghlWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("GHL contract webhook failed:", res.status);
    } else {
      console.log("✅ GHL contract webhook sent");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("GHL contract error:", err);
    return NextResponse.json({ ok: true });
  }
}
