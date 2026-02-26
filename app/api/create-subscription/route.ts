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

    const taxRateId = process.env.STRIPE_TAX_RATE_ID;
    const selectedBots = BOTS.filter((b) => selectedBotIds.includes(b.id));

    // Create a Product + Price for each bot (base price, no GST baked in)
    const items = await Promise.all(
      selectedBots.map(async (bot) => {
        const product = await stripe.products.create({
          name: `${bot.icon} ${bot.name}`,
          description: bot.description,
        });

        const price = await stripe.prices.create({
          product: product.id,
          currency: "aud",
          unit_amount: bot.price * 100, // base price only, NO GST baked in
          recurring: { interval: "month" },
        });

        return {
          price: price.id,
          quantity: 1,
          // Attach tax rate so GST shows as a separate line on the invoice
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
        };
      })
    );

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items,
      trial_period_days: 30,
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
