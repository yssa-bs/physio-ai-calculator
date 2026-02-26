import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Required: disable body parsing so we can verify the raw signature
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.arrayBuffer();
    event = stripe.webhooks.constructEvent(
      Buffer.from(body),
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Handle events ──────────────────────────────────────────────────────────
  if (
    event.type === "checkout.session.completed" ||
    event.type === "invoice.payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only fire on the initial checkout completion (not recurring invoices)
    if (event.type === "checkout.session.completed") {
      await handleSuccessfulPayment(session);
    }
  }

  return NextResponse.json({ received: true });
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const subMeta = (session as any).subscription_data?.metadata || {};

  // Merge metadata from session and subscription
  const leadName = meta.lead_name || subMeta.lead_name || "";
  const leadEmail = meta.lead_email || session.customer_email || "";
  const leadPractice = meta.lead_practice || subMeta.lead_practice || "";
  const leadPhone = subMeta.lead_phone || "";
  const leadWebsite = subMeta.lead_website || "";
  const botIds = (meta.bot_ids || subMeta.bot_ids || "").split(",");
  const totalMonthly = subMeta.total_monthly || "";
  const totalSetup = subMeta.total_setup || "";
  const projectedRevenue = subMeta.projected_monthly_revenue || "";

  const ghlPayload = {
    // Standard GHL contact fields
    firstName: leadName.split(" ")[0] || leadName,
    lastName: leadName.split(" ").slice(1).join(" ") || "",
    email: leadEmail,
    phone: leadPhone,
    companyName: leadPractice,
    website: leadWebsite,

    // Custom fields — map these to your GHL custom field keys
    customField: {
      bot_ids: botIds.join(", "),
      monthly_investment: totalMonthly,
      setup_fee: totalSetup,
      projected_monthly_revenue: projectedRevenue,
      stripe_session_id: session.id,
      payment_status: "paid",
      source: "AI Revenue Calculator — Stripe Checkout",
    },

    // Tags to apply in GHL
    tags: ["AI Bot Customer", "Stripe Paid", ...botIds.map((id: string) => `bot:${id}`)],
  };

  const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
  if (ghlWebhookUrl) {
    try {
      const res = await fetch(ghlWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ghlPayload),
      });
      if (!res.ok) {
        console.error("GHL webhook failed:", res.status, await res.text());
      } else {
        console.log("✅ GHL webhook sent for:", leadEmail);
      }
    } catch (err) {
      console.error("GHL webhook error:", err);
    }
  }

  console.log("✅ Payment complete:", {
    session: session.id,
    customer: leadEmail,
    practice: leadPractice,
    bots: botIds,
  });
}
