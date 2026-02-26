import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grandTotal, totalMonthly, currency, metadata, customerEmail, selectedBots } = body;

    if (!grandTotal || grandTotal < 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Step 1: Create or retrieve a Stripe Customer
    let customer;
    const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        metadata: metadata || {},
      });
    }

    // Step 2: One-time PaymentIntent for the full amount due today
    // (setup fee + first month + GST)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100), // in cents
      currency: currency || "aud",
      customer: customer.id,
      metadata: {
        ...metadata,
        payment_type: "initial_charge",
        includes: "setup_fee + first_month + gst",
      },
      description: `AI Agency Institute — Setup fee + first month (${selectedBots?.join(", ") || ""})`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    });
  } catch (err) {
    console.error("PaymentIntent error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
