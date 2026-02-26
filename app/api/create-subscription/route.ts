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

    // For subscriptions, Stripe requires a Price with a Product ID.
    // We create a Product + Price on the fly for each bot.
    const items = await Promise.all(
      selectedBots.map(async (bot) => {
        // Create a product
        const product = await stripe.products.create({
          name: `${bot.icon} ${bot.name}`,
          description: bot.description,
        });

        // Create a recurring price for this product (monthly + 10% GST)
        const price = await stripe.prices.create({
          product: product.id,
          currency: "aud",
          unit_amount: Math.round(bot.price * 1.1 * 100), // monthly + GST in cents
          recurring: { interval: "month" },
        });

        return { price: price.id, quantity: 1 };
      })
    );

    // Create subscription with 30-day trial
    // (customer already paid first month via PaymentIntent)
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
