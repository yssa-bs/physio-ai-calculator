import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { BOTS } from "@/lib/bots";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selectedBotIds, lead, totalMonthly, totalSetup, totalRevenue } = body;

    if (!selectedBotIds || selectedBotIds.length === 0) {
      return NextResponse.json({ error: "No bots selected" }, { status: 400 });
    }

    const selectedBots = BOTS.filter((b) => selectedBotIds.includes(b.id));
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...selectedBots.map((bot) => ({
        price_data: {
          currency: "aud",
          product_data: {
            name: `${bot.icon} ${bot.name}`,
            description: bot.description,
          },
          unit_amount: bot.price * 100,
          recurring: { interval: "month" as const },
        },
        quantity: 1,
      })),
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: "One-Time Setup Fee",
            description: `Setup for: ${selectedBots.map((b) => b.name).join(", ")}`,
          },
          unit_amount: totalSetup * 100,
          recurring: { interval: "month" as const },
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      subscription_data: {
        metadata: {
          bot_ids: selectedBotIds.join(","),
          lead_name: lead?.name || "",
          lead_email: lead?.email || "",
          lead_phone: lead?.phone || "",
          lead_practice: lead?.practice || "",
          lead_website: lead?.website || "",
          total_monthly: String(totalMonthly),
          total_setup: String(totalSetup),
          projected_monthly_revenue: String(totalRevenue),
        },
      },
      customer_email: lead?.email || undefined,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?cancelled=true`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      metadata: {
        lead_name: lead?.name || "",
        lead_email: lead?.email || "",
        lead_practice: lead?.practice || "",
        bot_ids: selectedBotIds.join(","),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
