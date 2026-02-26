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

    // ── Build Stripe line items ──────────────────────────────────────────────
    // Strategy:
    //   • One subscription item per bot (monthly recurring)
    //   • One additional one-time payment for the total setup fee
    //
    // Stripe Checkout supports mixed one-time + recurring items in a single
    // session using `mode: "subscription"` with `invoice_now` for setup fees
    // OR we use two separate sessions. The cleanest UX is:
    //   • mode: "subscription" for recurring bots
    //   • Add the setup fee as a one-time line item using `subscription_data.trial_period_days: 0`
    //     and a separate invoice item — or more simply, add it as an
    //     `add_invoice_items` entry which is charged immediately.

    const subscriptionLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      selectedBots.map((bot) => ({
        price_data: {
          currency: "aud",
          product_data: {
            name: `${bot.icon} ${bot.name}`,
            description: bot.description,
            metadata: { bot_id: bot.id, category: bot.category },
          },
          unit_amount: bot.price * 100, // cents
          recurring: { interval: "month" },
        },
        quantity: 1,
      }));

    // Setup fee as an invoice item added to the first invoice
    const addInvoiceItems: Stripe.Checkout.SessionCreateParams.SubscriptionData.InvoiceItem[] =
      [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "One-Time Setup Fee",
              description: `Setup for: ${selectedBots.map((b) => b.name).join(", ")}`,
            },
            unit_amount: totalSetup * 100,
          },
          quantity: 1,
        },
      ];

    // ── Create the Checkout Session ──────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: subscriptionLineItems,
      subscription_data: {
        add_invoice_items: addInvoiceItems,
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
      custom_text: {
        submit: {
          message: `You're locking in ${selectedBots.length} AI bot${selectedBots.length > 1 ? "s" : ""} for your practice. The setup fee is charged today; your monthly subscription starts immediately.`,
        },
      },
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
