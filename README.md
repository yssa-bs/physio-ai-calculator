# 🤖 Physio AI Revenue Calculator
### Next.js 14 · Stripe Checkout · GoHighLevel Integration · Vercel

---

## Overview

This app lets physio practice owners select AI bots, calculate their revenue uplift, submit their details to GoHighLevel, and pay via Stripe Checkout — all in one flow.

**Payment model:**
- One-time setup fee → charged immediately on first invoice
- Monthly subscription per bot → recurring via Stripe Billing

---

## ⚡ Quick Deploy to Vercel

### Step 1 — Push to GitHub

```bash
cd physio-calculator
git init
git add .
git commit -m "Initial commit"
gh repo create physio-ai-calculator --public --push
# OR: create a repo on github.com and push manually
```

### Step 2 — Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy** (it will fail first time — that's fine, we need env vars)

### Step 3 — Set Environment Variables in Vercel

Go to your project → **Settings** → **Environment Variables** and add:

| Key | Value | Where to get it |
|-----|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Same as above |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | See Step 4 below |
| `GHL_WEBHOOK_URL` | `https://services.leadconnectorhq.com/hooks/...` | See Step 5 below |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |

> 💡 **Testing?** Use `sk_test_...` and `pk_test_...` keys instead. Never mix test and live keys.

### Step 4 — Set up Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://your-app.vercel.app/api/webhook`
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
5. Copy the **Signing secret** (`whsec_...`) → paste into `STRIPE_WEBHOOK_SECRET` in Vercel

### Step 5 — Set up GoHighLevel Webhook

**Option A — Workflow Trigger (recommended):**
1. In GHL → **Automation** → **Workflows** → Create new
2. Trigger: **Webhook** → Copy the webhook URL
3. Add actions: Create/Update Contact, Add Tags, Send notification email, etc.
4. Paste the URL into `GHL_WEBHOOK_URL` in Vercel

**Option B — Direct Webhook:**
1. GHL → **Settings** → **Integrations** → **Webhooks**
2. Create a new inbound webhook
3. Paste the URL into `GHL_WEBHOOK_URL` in Vercel

### Step 6 — Redeploy

After setting env vars:
- Vercel → your project → **Deployments** → click the three dots on the latest → **Redeploy**

---

## 🏗️ Project Structure

```
physio-calculator/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Main calculator (client component)
│   ├── success/
│   │   ├── page.tsx            # Success page wrapper
│   │   └── SuccessContent.tsx  # Success page content
│   └── api/
│       ├── checkout/
│       │   └── route.ts        # POST → creates Stripe Checkout session
│       ├── lead/
│       │   └── route.ts        # POST → sends lead to GHL before checkout
│       └── webhook/
│           └── route.ts        # POST → Stripe webhook (fires after payment)
├── lib/
│   └── bots.ts                 # All bot definitions, prices, calc formulas
├── .env.example                # Copy to .env.local for local dev
├── vercel.json                 # Vercel config (deploys to Sydney region)
└── README.md                   # This file
```

---

## 💳 Payment Flow

```
User selects bots
        ↓
User fills lead form → POST /api/lead → GHL webhook (lead tagged as "not yet paid")
        ↓
User clicks "Pay with Stripe"
        ↓
POST /api/checkout → Stripe creates Checkout Session with:
  • Line items: one recurring price per bot (monthly)
  • add_invoice_items: one-time setup fee (charged on first invoice)
        ↓
User redirected to Stripe Checkout (hosted page)
        ↓
Payment complete → Stripe fires webhook to /api/webhook
        ↓
/api/webhook → GHL webhook (contact updated, tagged as "Stripe Paid")
        ↓
User redirected to /success?session_id=cs_...
```

---

## 🧑‍💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your keys
cp .env.example .env.local

# 3. Run the dev server
npm run dev
# → http://localhost:3000

# 4. Forward Stripe webhooks locally (requires Stripe CLI)
stripe listen --forward-to localhost:3000/api/webhook
# Copy the whsec_... printed and put it in STRIPE_WEBHOOK_SECRET in .env.local
```

---

## 🔧 Customising the Bots

All bot definitions live in `/lib/bots.ts`. Each bot has:

```typescript
{
  id: "unique-id",
  name: "Bot Display Name",
  category: "Phase 1 / Add-on / etc",
  price: 500,        // AUD per month
  setupFee: 1000,    // AUD one-time
  description: "...",
  icon: "🤖",
  inputs: [...],     // Slider inputs for the calculator
  calc: (inputs) => Math.round(...),  // Revenue calculation
}
```

Change prices, add new bots, or adjust formulas here — the Stripe checkout automatically picks up the current prices at the time of purchase.

---

## 🛠️ GHL Field Mapping

The webhook sends these fields. Map them to your GHL custom fields:

| Field | Description |
|-------|-------------|
| `firstName` / `lastName` | Lead's name |
| `email` | Lead's email |
| `phone` | Lead's phone |
| `companyName` | Practice name |
| `website` | Practice website |
| `customField.bot_ids` | Comma-separated bot IDs selected |
| `customField.monthly_investment` | Total monthly spend |
| `customField.setup_fee` | Total setup fee |
| `customField.projected_monthly_revenue` | Calculator's revenue estimate |
| `customField.payment_status` | `"lead — not yet paid"` or `"paid"` |
| `customField.stripe_session_id` | Stripe session ID (for paid leads) |
| `tags` | Auto-applied tags including `bot:receptionist`, etc. |

---

## ❓ Troubleshooting

**"Stripe checkout error: No such price"**
→ You don't need pre-made Price IDs — prices are created dynamically. Make sure your `STRIPE_SECRET_KEY` is correct.

**Webhook not firing**
→ Check Stripe Dashboard → Webhooks → your endpoint → recent deliveries. Also confirm `STRIPE_WEBHOOK_SECRET` matches.

**GHL not receiving leads**
→ Test your GHL webhook URL with a tool like [webhook.site](https://webhook.site) first. Check GHL workflow is published.

**Deployment failing on Vercel**
→ Check build logs. Most common cause: missing env variables. All 5 vars must be set.
