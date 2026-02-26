"use client";

import { useState, useMemo, useCallback } from "react";
import { BOTS, MIN_MONTHLY, fmt } from "@/lib/bots";

const BRAND = "#892BE2";
const BRAND_LIGHT = "#f3e8ff";
const BRAND_DARK = "#6b21a8";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`;

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function InputRow({
  input,
  value,
  onChange,
  botLabel,
}: {
  input: (typeof BOTS)[0]["inputs"][0];
  value: number;
  onChange: (v: number) => void;
  botLabel: string;
}) {
  const displayVal =
    input.suffix === "%"
      ? `${value}%`
      : input.prefix === "$"
      ? `$${value}`
      : value;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 1fr",
        gap: 12,
        alignItems: "center",
        padding: "14px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
          {input.label}
        </div>
        <div style={{ fontSize: 11, color: BRAND, fontWeight: 500, marginTop: 2 }}>
          {botLabel}
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <input
          type="range"
          min={input.min}
          max={input.max}
          step={input.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: BRAND, cursor: "pointer" }}
        />
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginTop: 2 }}>
          {displayVal}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>
        {input.unit}
      </div>
    </div>
  );
}

function BotSelector({
  bot,
  selected,
  onToggle,
}: {
  bot: (typeof BOTS)[0];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderRadius: 14,
        cursor: "pointer",
        border: selected ? `2px solid ${BRAND}` : "2px solid #e5e7eb",
        background: selected ? BRAND_LIGHT : "#fff",
        transition: "all 0.2s ease",
        boxShadow: selected ? `0 2px 12px rgba(137,43,226,0.12)` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: selected ? BRAND : "#e5e7eb",
            color: selected ? "#fff" : "#9ca3af",
            fontSize: 14,
            fontWeight: 700,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
        >
          {selected ? "✓" : "+"}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>
            {bot.category} — {bot.name}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {bot.description}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>
            {fmt(bot.price)}
            <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/mo</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
            + {fmt(bot.setupFee)}{" "}
            <span style={{ fontWeight: 400 }}>setup</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>+GST</div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  large,
  color,
}: {
  label: string;
  value: string;
  large?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <span style={{ fontSize: 14, color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontSize: large ? 28 : 18,
          fontWeight: large ? 800 : 700,
          color: color || "#111",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

export default function PhysioMarketplace() {
  const [selected, setSelected] = useState<string[]>([
    "receptionist",
    "sick-day",
    "retention",
    "review",
    "nurture",
    "reactivation",
  ]);

  const [inputs, setInputs] = useState<Record<string, Record<string, number>>>(
    () => {
      const init: Record<string, Record<string, number>> = {};
      BOTS.forEach((b) => {
        init[b.id] = {};
        b.inputs.forEach((inp) => {
          init[b.id][inp.key] = inp.default;
        });
      });
      return init;
    }
  );

  const [lead, setLead] = useState({
    name: "",
    email: "",
    phone: "",
    practice: "",
    website: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }, []);

  const updateInput = useCallback(
    (botId: string, key: string, val: number) => {
      setInputs((prev) => ({
        ...prev,
        [botId]: { ...prev[botId], [key]: val },
      }));
    },
    []
  );

  const revenues = useMemo(() => {
    const r: Record<string, number> = {};
    BOTS.forEach((b) => {
      r[b.id] = selected.includes(b.id) ? b.calc(inputs[b.id]) : 0;
    });
    return r;
  }, [inputs, selected]);

  const totalRevenue = Object.values(revenues).reduce((a, b) => a + b, 0);
  const totalMonthly = selected.reduce(
    (s, id) => s + (BOTS.find((b) => b.id === id)?.price || 0),
    0
  );
  const totalSetup = selected.reduce(
    (s, id) => s + (BOTS.find((b) => b.id === id)?.setupFee || 0),
    0
  );
  const netGain = totalRevenue - totalMonthly;
  const annualUplift = totalRevenue * 12;
  const setupPayback =
    totalRevenue > 0 && netGain > 0 ? Math.ceil(totalSetup / netGain) : null;
  const roi =
    totalMonthly > 0
      ? Math.round((totalRevenue / totalMonthly) * 100) / 100
      : 0;
  const meetsMin = totalMonthly >= MIN_MONTHLY;

  const selectedBots = BOTS.filter((b) => selected.includes(b.id));
  const allInputs = selectedBots.flatMap((b) =>
    b.inputs.map((inp) => ({ ...inp, botId: b.id, botLabel: b.name }))
  );

  // Submit lead to GHL via our API route
  const handleLeadSubmit = async () => {
    setLeadLoading(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          selectedBotIds: selected,
          totalMonthly,
          totalSetup,
          totalRevenue,
        }),
      });
    } catch {
      // Non-blocking — don't fail the UI
    } finally {
      setLeadLoading(false);
      setSubmitted(true);
    }
  };

  // Redirect to Stripe Checkout
  const handleStripeCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedBotIds: selected,
          lead,
          totalMonthly,
          totalSetup,
          totalRevenue,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setCheckoutLoading(false);
    }
  };

  const leadFormValid =
    lead.name && lead.email && lead.phone && lead.practice;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          background: BRAND_GRADIENT,
          padding: "48px 24px 56px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -50,
            left: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 16px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              marginBottom: 16,
              letterSpacing: 0.8,
            }}
          >
            AI AGENCY INSTITUTE — REVENUE CALCULATOR
          </div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 34,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.2,
            }}
          >
            How much could AI make <em>your practice?</em>
          </h1>
          <p
            style={{
              margin: "0 auto",
              fontSize: 16,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            Enter your numbers and select the bots you're considering to see
            your projected monthly revenue uplift.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 20px 200px" }}>

        {/* ── SECTION 1: SELECT BOTS ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
            Select the bots you want to implement
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            Click to toggle each bot on or off. Minimum spend: {fmt(MIN_MONTHLY)}/mo.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {BOTS.map((bot) => (
              <BotSelector
                key={bot.id}
                bot={bot}
                selected={selected.includes(bot.id)}
                onToggle={() => toggle(bot.id)}
              />
            ))}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />

        {/* ── SECTION 2: PRACTICE NUMBERS ── */}
        {selected.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
              Your practice numbers
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>
              Adjust the sliders to match your practice.
            </p>
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                padding: "8px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {allInputs.map((inp) => (
                <InputRow
                  key={`${inp.botId}-${inp.key}`}
                  input={inp}
                  value={inputs[inp.botId][inp.key]}
                  onChange={(val) => updateInput(inp.botId, inp.key, val)}
                  botLabel={inp.botLabel}
                />
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />

        {/* ── SECTION 3: REVENUE SUMMARY ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
            Your Revenue Opportunity
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            Based on your numbers, conservatively estimated
          </p>

          {selected.length === 0 ? (
            <div
              style={{
                padding: 40,
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ margin: 0, fontSize: 15 }}>
                Select at least one bot above to see your projected revenue
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                padding: 24,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {/* Big number */}
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0 24px",
                  borderBottom: "2px solid #f3f4f6",
                }}
              >
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
                  Additional monthly revenue
                </div>
                <div style={{ fontSize: 44, fontWeight: 800, color: BRAND, lineHeight: 1 }}>
                  {fmt(totalRevenue)}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                  +GST · per month
                </div>
              </div>

              {/* Bot breakdown */}
              <div style={{ padding: "16px 0", borderBottom: "2px solid #f3f4f6" }}>
                {selectedBots.map((bot) => (
                  <div
                    key={bot.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      {bot.icon} {bot.name}
                    </span>
                    <span style={{ fontWeight: 600, color: "#111" }}>
                      {fmt(revenues[bot.id])}/mo
                    </span>
                  </div>
                ))}
              </div>

              {/* Key metrics */}
              <div style={{ paddingTop: 16 }}>
                <SummaryRow
                  label="Monthly investment"
                  value={fmt(totalMonthly)}
                  color={BRAND_DARK}
                />
                <SummaryRow
                  label="Net gain per month"
                  value={fmt(netGain)}
                  large
                  color="#047857"
                />
                <SummaryRow label="Annual uplift" value={fmt(annualUplift)} color="#047857" />
                <SummaryRow label="Setup fee" value={fmt(totalSetup)} />
                <SummaryRow
                  label="Setup payback"
                  value={
                    setupPayback && setupPayback > 0
                      ? `~${setupPayback} month${setupPayback > 1 ? "s" : ""}`
                      : "—"
                  }
                />
                <SummaryRow
                  label="Return on investment"
                  value={roi > 0 ? `${roi}x` : "—"}
                  color={BRAND}
                />
              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: 16,
                  padding: "12px 16px",
                  background: BRAND_LIGHT,
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: 13, color: BRAND_DARK, fontWeight: 600 }}>
                  {roi > 0
                    ? `Every $1 you invest generates ${fmt(Math.round(roi * 100) / 100)}${roi >= 2 ? " 🚀" : ""}`
                    : "Select bots above to calculate your return."}
                </span>
              </div>
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />

        {/* ── SECTION 4: LEAD CAPTURE ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
            {submitted ? "Thanks! We'll be in touch." : "Get your personalised AI plan"}
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
            {submitted
              ? "Your details have been saved and sent to our team. You can still proceed to checkout below."
              : "Enter your details and we'll send you a detailed breakdown with next steps."}
          </p>

          {submitted ? (
            <div
              style={{
                padding: 32,
                background: "#ecfdf5",
                borderRadius: 16,
                border: "1px solid #a7f3d0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#065f46" }}>
                Details submitted successfully
              </div>
              <div style={{ fontSize: 14, color: "#047857", marginTop: 8 }}>
                {selectedBots.map((b) => b.name).join(", ")}
              </div>
              <div style={{ fontSize: 14, color: "#047857", marginTop: 4 }}>
                Projected monthly uplift: {fmt(totalRevenue)} · Investment:{" "}
                {fmt(totalMonthly)}/mo
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                padding: 24,
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Your name *
                    </label>
                    <input
                      value={lead.name}
                      onChange={(e) =>
                        setLead((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Full name"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Practice name *
                    </label>
                    <input
                      value={lead.practice}
                      onChange={(e) =>
                        setLead((p) => ({ ...p, practice: e.target.value }))
                      }
                      placeholder="e.g. Auckland Physio Clinic"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Email *
                    </label>
                    <input
                      value={lead.email}
                      onChange={(e) =>
                        setLead((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="you@clinic.com.au"
                      type="email"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Phone *
                    </label>
                    <input
                      value={lead.phone}
                      onChange={(e) =>
                        setLead((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="04XX XXX XXX"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Website
                  </label>
                  <input
                    value={lead.website}
                    onChange={(e) =>
                      setLead((p) => ({ ...p, website: e.target.value }))
                    }
                    placeholder="www.yourclinic.com.au"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleLeadSubmit}
                disabled={!leadFormValid || leadLoading}
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: "16px 0",
                  background:
                    leadFormValid && !leadLoading ? BRAND_GRADIENT : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: leadFormValid && !leadLoading ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  boxShadow: leadFormValid
                    ? `0 4px 16px rgba(137,43,226,0.3)`
                    : "none",
                }}
              >
                {leadLoading ? "Sending…" : "Get My AI Plan →"}
              </button>

              <p
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textAlign: "center",
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                Your details are captured securely. We'll send a personalised
                breakdown within 24 hours.
              </p>
            </div>
          )}
        </div>

        {/* ── SECTION 5: STRIPE CHECKOUT ── */}
        {selected.length > 0 && meetsMin && (
          <>
            <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
                Ready to get started?
              </h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>
                Lock in your selected bots and we'll start building your AI
                systems.
              </p>

              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  style={{
                    width: "100%",
                    padding: "18px 0",
                    background: BRAND_GRADIENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: `0 6px 24px rgba(137,43,226,0.3)`,
                    transition: "all 0.2s",
                  }}
                >
                  Get Started — {fmt(totalMonthly)}/mo + {fmt(totalSetup)} setup →
                </button>
              ) : (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #e5e7eb",
                    padding: 24,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
                    Order Summary
                  </h3>

                  {selectedBots.map((bot) => (
                    <div
                      key={bot.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: 14,
                        gap: 8,
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        {bot.icon} {bot.name}
                      </span>
                      <span style={{ fontWeight: 700, color: BRAND }}>
                        {fmt(bot.price)}/mo
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        + {fmt(bot.setupFee)} setup
                      </span>
                    </div>
                  ))}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    <span>Monthly total (recurring)</span>
                    <span style={{ color: BRAND }}>
                      {fmt(totalMonthly)}/mo{" "}
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>
                        +GST
                      </span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    <span>One-time setup fee</span>
                    <span>
                      {fmt(totalSetup)}{" "}
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>
                        +GST
                      </span>
                    </span>
                  </div>

                  {/* Due today callout */}
                  <div
                    style={{
                      margin: "8px 0 20px",
                      padding: "14px 18px",
                      background: "#faf5ff",
                      borderRadius: 12,
                      border: `1px solid ${BRAND_LIGHT}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: BRAND_DARK }}>
                        Due today
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        Setup fee + first month, charged via Stripe
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: BRAND }}>
                      {fmt(totalSetup + totalMonthly)}
                    </div>
                  </div>

                  {checkoutError && (
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 10,
                        marginBottom: 16,
                        fontSize: 13,
                        color: "#dc2626",
                      }}
                    >
                      ⚠️ {checkoutError}
                    </div>
                  )}

                  <button
                    onClick={handleStripeCheckout}
                    disabled={checkoutLoading}
                    style={{
                      width: "100%",
                      padding: "16px 0",
                      background: checkoutLoading
                        ? "#d1d5db"
                        : "linear-gradient(135deg, #635bff 0%, #7c3aed 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: checkoutLoading ? "not-allowed" : "pointer",
                      boxShadow: checkoutLoading
                        ? "none"
                        : "0 4px 16px rgba(99,91,255,0.3)",
                      transition: "all 0.2s",
                    }}
                  >
                    {checkoutLoading
                      ? "Redirecting to Stripe…"
                      : "🔒 Pay Securely with Stripe →"}
                  </button>

                  <p
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      textAlign: "center",
                      marginTop: 12,
                      marginBottom: 0,
                    }}
                  >
                    Powered by Stripe · SSL encrypted · Cancel any time
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── FOOTER ── */}
        <div
          style={{
            textAlign: "center",
            padding: "20px 0 40px",
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          Projections are estimates based on the inputs provided and industry
          benchmarks.
          <br />
          Results may vary. Prepared by{" "}
          <strong style={{ color: "#6b7280" }}>AI Agency Institute</strong> ·
          aiagencyinstitute.com.au
        </div>
      </div>

      {/* ── STICKY BAR ── */}
      {selected.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#fff",
            borderTop: "1px solid #e5e7eb",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              maxWidth: 740,
              margin: "0 auto",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Investment </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: BRAND }}>
                  {fmt(totalMonthly)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>
                    /mo
                  </span>
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Revenue </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#047857" }}>
                  +{fmt(totalRevenue)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>
                    /mo
                  </span>
                </span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#6b7280" }}>ROI </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: BRAND }}>
                  {roi}x
                </span>
              </div>
            </div>
            {!meetsMin && (
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>
                Min. {fmt(MIN_MONTHLY)}/mo required
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
