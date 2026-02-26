import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead, selectedBotIds, totalMonthly, totalSetup, totalRevenue } = body;

    const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;

    if (!ghlWebhookUrl) {
      console.warn("GHL_WEBHOOK_URL not set — skipping lead capture");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const ghlPayload = {
      firstName: lead.name?.split(" ")[0] || lead.name,
      lastName: lead.name?.split(" ").slice(1).join(" ") || "",
      email: lead.email,
      phone: lead.phone,
      companyName: lead.practice,
      website: lead.website,

      customField: {
        bot_ids: selectedBotIds?.join(", ") || "",
        monthly_investment: String(totalMonthly || ""),
        setup_fee: String(totalSetup || ""),
        projected_monthly_revenue: String(totalRevenue || ""),
        payment_status: "lead — not yet paid",
        source: "AI Revenue Calculator — Lead Form",
      },

      tags: ["AI Calculator Lead", ...( selectedBotIds || []).map((id: string) => `interested:${id}`)],
    };

    const res = await fetch(ghlWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ghlPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("GHL lead capture failed:", res.status, text);
      // Don't fail the user-facing request — lead capture is non-blocking
    } else {
      console.log("✅ GHL lead captured:", lead.email);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Lead capture error:", err);
    // Non-blocking — always return 200 so the UI doesn't break
    return NextResponse.json({ ok: true, error: "capture failed silently" });
  }
}
