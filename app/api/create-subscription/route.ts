import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { BOTS } from "@/lib/bots";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, selectedBotIds, metadata } = body;

    if (!customerId || !selectedBotIds?.length) {
      return NextResponse.json({ error: "Missing customerId or bots" }, { status: 400 });
    }

    const selectedBots = BOTS.filter((b) => selectedBotIds.includes(b.id));

    // Build recurring line items — monthly only, NO setup fee
    const items = selectedBots.map((bot) => ({
      price_data: {
        currency: "aud",
        product_data: {
          name: `${bot.icon} ${bot.name}`,
          description: bot.description,
        },
        unit_amount: Math.round(bot.price * 1.1) * 100, // cents, monthly + 10% GST
        recurring: { interval: "month" as const },
      },
      quantity: 1,
    }));

    // Create subscription with a 1-month trial so the first recurring charge
    // fires one month from now (they already paid the first month via PaymentIntent)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items,
      trial_period_days: 30, // first recurring charge in 30 days
      metadata: {
        ...metadata,
        payment_type: "recurring_monthly",
      },
    });

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (err) {
    console.error("Subscription error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
