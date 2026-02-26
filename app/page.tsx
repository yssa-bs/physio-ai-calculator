"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { BOTS, MIN_MONTHLY, fmt } from "@/lib/bots";

const BRAND = "#892BE2";
const BRAND_LIGHT = "#f3e8ff";
const BRAND_DARK = "#6b21a8";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`;
const TAX_RATE = 0.10;

type View = "marketplace" | "checkout" | "contract" | "complete";

interface Lead {
  name: string; email: string; phone: string; position: string;
  businessName: string; abn: string; entityType: string;
  website: string; businessAddress: string; state: string; postcode: string;
}

const emptyLead: Lead = {
  name: "", email: "", phone: "", position: "",
  businessName: "", abn: "", entityType: "",
  website: "", businessAddress: "", state: "", postcode: "",
};

declare global {
  interface Window { Stripe: any; }
}

/* ─── Input Row ─────────────────────────────────────────────────────────── */
function InputRow({ input, value, onChange, botLabel }: {
  input: (typeof BOTS)[0]["inputs"][0]; value: number;
  onChange: (v: number) => void; botLabel: string;
}) {
  const display = input.suffix === "%" ? `${value}%` : input.prefix === "$" ? `$${value}` : value;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>{input.label}</div>
        <div style={{ fontSize: 11, color: BRAND, fontWeight: 500, marginTop: 2 }}>{botLabel}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <input type="range" min={input.min} max={input.max} step={input.step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: BRAND, cursor: "pointer" }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginTop: 2 }}>{display}</div>
      </div>
      <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{input.unit}</div>
    </div>
  );
}

/* ─── Field ─────────────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
  border: "2px solid #e5e7eb", borderRadius: 12, background: "#fff", color: "#111",
  outline: "none", boxSizing: "border-box", transition: "border 0.2s",
};

/* ─── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState<View>("marketplace");
  const [selected, setSelected] = useState<string[]>(["receptionist", "sick-day", "retention", "review", "nurture", "reactivation"]);
  const [inputs, setInputs] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    BOTS.forEach(b => { init[b.id] = {}; b.inputs.forEach(i => { init[b.id][i.key] = i.default; }); });
    return init;
  });
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [agreed, setAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState("");
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [sigTyped, setSigTyped] = useState("");
  const [sigError, setSigError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const sigHasDrawn = useRef(false);
  const stripeRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);

  // Calcs
  const revenues = useMemo(() => {
    const r: Record<string, number> = {};
    BOTS.forEach(b => { r[b.id] = selected.includes(b.id) ? b.calc(inputs[b.id]) : 0; });
    return r;
  }, [inputs, selected]);

  const selectedBots = useMemo(() => BOTS.filter(b => selected.includes(b.id)), [selected]);
  const totalRevenue = Object.values(revenues).reduce((a, b) => a + b, 0);
  const totalMonthly = selectedBots.reduce((s, b) => s + b.price, 0);
  const totalSetup = selectedBots.reduce((s, b) => s + b.setupFee, 0);
  const netGain = totalRevenue - totalMonthly;
  const roi = totalMonthly > 0 ? Math.round((totalRevenue / totalMonthly) * 100) / 100 : 0;
  const setupPayback = netGain > 0 ? Math.ceil(totalSetup / netGain) : null;
  const todaySubtotal = totalSetup + totalMonthly;
  const taxAmount = Math.round(todaySubtotal * TAX_RATE);
  const grandTotal = todaySubtotal + taxAmount;

  const toggle = useCallback((id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  }, []);

  const updateInput = useCallback((botId: string, key: string, val: number) => {
    setInputs(prev => ({ ...prev, [botId]: { ...prev[botId], [key]: val } }));
  }, []);

  const setLeadField = (key: keyof Lead, val: string) => setLead(prev => ({ ...prev, [key]: val }));

  const leadValid = lead.name && lead.email && lead.phone && lead.position && lead.businessName && lead.abn && lead.entityType && lead.businessAddress && lead.state && lead.postcode;

  // Load Stripe.js
  useEffect(() => {
    if (window.Stripe) { setStripeLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => setStripeLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Mount Stripe card element when on checkout view
  useEffect(() => {
    if (view !== "checkout" || !stripeLoaded) return;
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk || cardElementRef.current) return;
    try {
      stripeRef.current = window.Stripe(pk);
      const elements = stripeRef.current.elements({
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" }],
      });
      const card = elements.create("card", {
        style: {
          base: { fontFamily: "'DM Sans', sans-serif", fontSize: "16px", color: "#111", "::placeholder": { color: "#c4c7cc" } },
          invalid: { color: "#ef4444" },
        },
      });
      card.mount("#card-element-container");
      card.on("change", (e: any) => {
        setCardError(e.error ? e.error.message : "");
        const el = document.getElementById("card-element-container");
        if (el) { el.style.borderColor = e.error ? "#ef4444" : "#e5e7eb"; }
      });
      cardElementRef.current = card;
    } catch (e) { console.error("Stripe init error:", e); }
    return () => {
      if (cardElementRef.current) { cardElementRef.current.destroy(); cardElementRef.current = null; }
    };
  }, [view, stripeLoaded]);

  // Signature pad
  useEffect(() => {
    if (view !== "contract") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const t = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : e as MouseEvent;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const down = (e: MouseEvent) => { sigDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: MouseEvent) => { if (!sigDrawing.current) return; sigHasDrawn.current = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const up = () => { sigDrawing.current = false; };
    const tdown = (e: TouchEvent) => { e.preventDefault(); sigDrawing.current = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const tmove = (e: TouchEvent) => { e.preventDefault(); if (!sigDrawing.current) return; sigHasDrawn.current = true; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", up);
    canvas.addEventListener("mouseleave", up);
    canvas.addEventListener("touchstart", tdown, { passive: false });
    canvas.addEventListener("touchmove", tmove, { passive: false });
    canvas.addEventListener("touchend", up);
    return () => {
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseleave", up);
    };
  }, [view]);

  // Send lead to GHL
  const sendToGHL = async (type: string, extra: Record<string, any> = {}) => {
    const payload = {
      type, name: lead.name, email: lead.email, phone: lead.phone, position: lead.position,
      business_name: lead.businessName, abn: lead.abn, entity_type: lead.entityType,
      website: lead.website, business_address: lead.businessAddress, state: lead.state, postcode: lead.postcode,
      selected_bots: selectedBots.map(b => b.name).join(", "),
      bot_count: selectedBots.length, monthly_total: totalMonthly, setup_total: totalSetup,
      tax_amount: taxAmount, grand_total: grandTotal, projected_revenue: totalRevenue, roi: roi + "x",
      commencement_date: new Date().toISOString().split("T")[0],
      ...extra,
    };
    try {
      await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead: { name: lead.name, email: lead.email, phone: lead.phone, practice: lead.businessName, website: lead.website }, selectedBotIds: selected, totalMonthly, totalSetup, totalRevenue, ghlPayload: payload }) });
    } catch {}
  };

  const goToCheckout = () => {
    sendToGHL("lead");
    setView("checkout");
    window.scrollTo(0, 0);
  };

  const handlePayment = async () => {
    if (processing || !agreed || !cardElementRef.current || !stripeRef.current) return;
    setProcessing(true);
    setCardError("");
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal * 100,
          currency: "aud",
          metadata: { customer_name: lead.name, customer_email: lead.email, business_name: lead.businessName, abn: lead.abn, bots: selectedBots.map(b => b.name).join(", "), monthly_total: totalMonthly, setup_total: totalSetup, grand_total: grandTotal },
        }),
      });
      const { clientSecret, error: serverError } = await res.json();
      if (serverError) throw new Error(serverError);

      const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElementRef.current, billing_details: { name: lead.name, email: lead.email } },
      });

      if (error) { setCardError(error.message); setProcessing(false); return; }

      if (paymentIntent.status === "succeeded") {
        sendToGHL("payment", { stripe_payment_intent: paymentIntent.id });
        setView("contract");
        window.scrollTo(0, 0);
      }
    } catch (err) {
      setCardError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    sigHasDrawn.current = false;
  };

  const submitContract = async () => {
    if (!sigHasDrawn.current && !sigTyped.trim()) { setSigError("Please draw your signature or type your full name above."); return; }
    setSigError("");
    const btn = document.getElementById("sign-btn") as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }
    const canvas = canvasRef.current;
    const sigData = sigHasDrawn.current ? canvas?.toDataURL("image/png") : null;
    const sigName = sigTyped.trim() || lead.name;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    const contractPayload = {
      type: "contract_signed", name: lead.name, email: lead.email, phone: lead.phone, position: lead.position,
      business_name: lead.businessName, abn: lead.abn, entity_type: lead.entityType,
      website: lead.website, business_address: lead.businessAddress, state: lead.state, postcode: lead.postcode,
      selected_bots: selectedBots.map(b => b.name).join(", "),
      selected_bots_detail: JSON.stringify(selectedBots.map(b => ({ name: b.name, monthly: b.price, setup: b.setupFee }))),
      bot_count: selectedBots.length, monthly_total: totalMonthly, setup_total: totalSetup,
      tax_amount: taxAmount, grand_total: grandTotal, projected_revenue: totalRevenue,
      commencement_date: today.toISOString().split("T")[0],
      signature_name: sigName, signature_date: today.toISOString(),
      signature_image: sigData || "", agreement_version: "1.0",
      agreement_summary: `SERVICE AGREEMENT - AI Agency Institute\nSigned: ${dateStr}\nClient: ${lead.name} (${lead.position})\nBusiness: ${lead.businessName} (${lead.entityType})\nABN: ${lead.abn}\nAddress: ${lead.businessAddress}, ${lead.state} ${lead.postcode}\n---\nSelected Bots:\n${selectedBots.map(b => `  - ${b.name} - ${fmt(b.price)}/mo + ${fmt(b.setupFee)} setup`).join("\n")}\n---\nMonthly Fee: ${fmt(totalMonthly)} +GST\nSetup Fee: ${fmt(totalSetup)} +GST\nTotal Charged Today: ${fmt(grandTotal)} (incl. GST)\nDuration: 12 months (auto-renewing)\n---\nSigned by: ${sigName}\nSignature type: ${sigData ? "Drawn" : "Typed"}`,
    };

    try {
      await fetch("/api/ghl-contract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contractPayload) });
    } catch {}

    setView("complete");
    window.scrollTo(0, 0);
  };

  // ── VIEWS ─────────────────────────────────────────────────────────────────

  if (view === "complete") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f8fa", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(34,197,94,0.25)", fontSize: 36, color: "#fff" }}>✓</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6 }}>You're all set!</h1>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.6 }}>Payment confirmed and agreement signed. Book your onboarding call below to get started.</p>
          </div>
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 24 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>AI Bot Onboarding — Strategy & Setup Call</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Pick a time that works for you. We'll walk through your bots and get everything configured.</div>
              </div>
            </div>
            <iframe src="https://link.aiagencyinstitute.com/widget/booking/02N2Rsz9K5nbH72fLyh3" style={{ width: "100%", height: 1100, border: "none", display: "block" }} scrolling="no" loading="eager" />
          </div>
          <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(137,43,226,0.04)", border: "1px solid rgba(137,43,226,0.12)", fontSize: 14, color: "#6b7280", lineHeight: 1.5, textAlign: "center" }}>
            Questions? Email us at <strong style={{ color: BRAND }}>support@aiagencyinstitute.com</strong>
          </div>
        </div>
        <script src="https://link.aiagencyinstitute.com/js/form_embed.js" async />
      </div>
    );
  }

  if (view === "contract") {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    return (
      <div style={{ minHeight: "100vh", background: "#f8f8fa", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
        <header style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>AI AGENCY <span style={{ color: BRAND }}>INSTITUTE</span></span>
          <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>✅ Payment Confirmed</span>
        </header>
        <div style={{ maxWidth: 740, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111", marginBottom: 8 }}>One last step — sign your service agreement</h1>
            <p style={{ fontSize: 15, color: "#6b7280" }}>Review the agreement below then sign to complete your order.</p>
          </div>

          {/* Agreement document */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.04)", marginBottom: 32, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Service Agreement</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>AI Agency Institute</h2>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>ABN 97 669 051 745</div>
            </div>

            <div style={{ padding: "16px 20px", background: "#faf5ff", borderRadius: 12, border: "1px solid #e9d5ff", marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>The Company</div>
                  <div style={{ fontWeight: 700 }}>AI Agency Institute</div>
                  <div style={{ color: "#6b7280" }}>ABN 97 669 051 745</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>The Client</div>
                  <div style={{ fontWeight: 700 }}>{lead.businessName} {lead.entityType ? `(${lead.entityType})` : ""}</div>
                  <div style={{ color: "#6b7280" }}>ABN {lead.abn}</div>
                  <div style={{ color: "#6b7280" }}>{lead.name}, {lead.position}</div>
                  <div style={{ color: "#6b7280" }}>{lead.businessAddress}, {lead.state} {lead.postcode}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 20px", background: "#f9fafb", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Schedule of Services</div>
              {selectedBots.map(b => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb" }}>
                  <span>{b.icon} {b.name}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(b.price)}/mo + {fmt(b.setupFee)} setup</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontWeight: 700, borderTop: "2px solid #e5e7eb", marginTop: 4 }}>
                <span>Monthly retainer</span><span style={{ color: BRAND }}>{fmt(totalMonthly)} +GST/mo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 700 }}>
                <span>One-time setup fee</span><span>{fmt(totalSetup)} +GST</span>
              </div>
            </div>

            {[
              { num: "1", title: "Term & Services", body: `(A) This Agreement commences on ${dateStr} and continues for a minimum term of twelve (12) months.\n(B) Upon completion of the initial twelve (12) month term, this Agreement will automatically renew for subsequent twelve (12) month periods unless either Party provides written notice of their intent not to renew at least thirty (30) days prior to the end of the then-current term.` },
              { num: "2", title: "Obligations", body: "(A) The Client will act in good faith in all dealings with the Company;\n(B) Make due and punctual payment of the Service Fee;\n(C) Not modify, misuse, reverse engineer, copy or create derivative works from any AI bot configurations created by the Company;\n(D) Not license, sell, rent, lease, transfer or assign their access to the AI bot platform." },
              { num: "3", title: "Payment of Services", body: `(A) The Client is obligated to pay the monthly Service Fees of ${fmt(totalMonthly)} +GST per month for a minimum of twelve (12) consecutive months, along with a one-time setup fee of ${fmt(totalSetup)} +GST.\n(B) Where the Client requests termination prior to completion of the 12-month period, the Client will be liable to pay Service Fees corresponding to the full 12-month commitment.\n(C) If the Client does not pay the Service Fee, the Company reserves the right to charge default interest of 10% per annum.` },
              { num: "4", title: "Intellectual Property", body: "The Company owns all Intellectual Property Rights created out of the performance of this Agreement including AI bot configurations, templated texts, automation workflows, designs and processes. The Company grants to the Client a non-exclusive, revocable and non-transferable licence to use such IP for the purposes of realising the benefits of the Services." },
              { num: "5", title: "Confidentiality", body: "The Parties must keep confidential and not disclose to any other person any confidential information, unless disclosure is required by law." },
              { num: "6", title: "Limited Liability", body: "The Company will not be liable for any direct, indirect, incidental, special, consequential or economic damages. The Company's liability is limited to the re-performance of the Services." },
              { num: "7", title: "Governing Law", body: "This Agreement is governed by the laws of NSW Australia. The exclusive venue for resolving any dispute will be in the courts of NSW." },
            ].map(clause => (
              <div key={clause.num} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{clause.num}. {clause.title}</div>
                {clause.body.split("\n").map((line, i) => <p key={i} style={{ margin: "4px 0" }}>{line}</p>)}
              </div>
            ))}
          </div>

          {/* Signature area */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>Sign this agreement</h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>Draw your signature below or type your full name to sign electronically.</p>

            <canvas ref={canvasRef} style={{ width: "100%", height: 160, border: "2px dashed #d1d5db", borderRadius: 12, cursor: "crosshair", background: "#fafafa", display: "block", touchAction: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>✍️ Draw your signature above</span>
              <button onClick={clearSignature} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#6b7280", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              <span style={{ fontSize: 11, color: "#9ca3af" }}>OR TYPE YOUR NAME</span>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>

            <input value={sigTyped} onChange={e => setSigTyped(e.target.value)} placeholder="Type your full name" style={{ ...inputStyle, fontFamily: "'Dancing Script', cursive", fontSize: 26, textAlign: "center", padding: 12, marginBottom: 16 }} />

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Date: <strong style={{ color: "#111" }}>{dateStr}</strong> &nbsp;|&nbsp; Signed by: <strong style={{ color: "#111" }}>{lead.name}, {lead.position}</strong>
            </div>

            {sigError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{sigError}</div>}

            <button id="sign-btn" onClick={submitContract} style={{ width: "100%", padding: "18px 0", background: BRAND_GRADIENT, color: "#fff", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 24px rgba(137,43,226,0.3)`, fontFamily: "'DM Sans', sans-serif" }}>
              I Agree — Sign & Complete →
            </button>
            <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 12 }}>
              By signing, you agree to be bound by all terms of this Service Agreement. A copy will be emailed to <strong>{lead.email}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "checkout") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f8fa", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <header style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>AI AGENCY <span style={{ color: BRAND }}>INSTITUTE</span></span>
            <div style={{ height: 18, width: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Secure Checkout</span>
          </div>
          <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>🔒 SSL Secured</span>
        </header>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>Complete your order</h1>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Set up your AI bots for <strong style={{ color: "#111" }}>{lead.businessName || "your practice"}</strong></p>
              </div>
              <button onClick={() => setView("marketplace")} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#6b7280", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>← Back</button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {/* Left: form + payment */}
              <div style={{ flex: "1 1 340px", padding: 28, borderRight: "1px solid #f3f4f6" }}>

                {/* Your details */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Your details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label=""><input style={inputStyle} placeholder="Full name *" value={lead.name} onChange={e => setLeadField("name", e.target.value)} /></Field>
                    <Field label=""><input style={inputStyle} placeholder="Position / Title *" value={lead.position} onChange={e => setLeadField("position", e.target.value)} list="positions" /><datalist id="positions"><option value="Director" /><option value="Owner" /><option value="Practice Manager" /><option value="Partner" /><option value="CEO" /></datalist></Field>
                    <Field label=""><input style={inputStyle} placeholder="Email address *" type="email" value={lead.email} onChange={e => setLeadField("email", e.target.value)} /></Field>
                    <Field label=""><input style={inputStyle} placeholder="Phone number *" value={lead.phone} onChange={e => setLeadField("phone", e.target.value)} /></Field>
                  </div>
                </div>

                {/* Business details */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Business details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label=""><input style={inputStyle} placeholder="Business / Trading name *" value={lead.businessName} onChange={e => setLeadField("businessName", e.target.value)} /></Field>
                    <Field label=""><input style={inputStyle} placeholder="ABN *" value={lead.abn} onChange={e => setLeadField("abn", e.target.value)} /></Field>
                    <Field label="">
                      <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={lead.entityType} onChange={e => setLeadField("entityType", e.target.value)}>
                        <option value="" disabled>Entity type *</option>
                        {["Pty Ltd", "Sole Trader", "Partnership", "Trust", "Other"].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label=""><input style={inputStyle} placeholder="Website (optional)" value={lead.website} onChange={e => setLeadField("website", e.target.value)} /></Field>
                  </div>
                </div>

                {/* Business address */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Registered business address</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label=""><input style={inputStyle} placeholder="Street address *" value={lead.businessAddress} onChange={e => setLeadField("businessAddress", e.target.value)} /></Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="">
                        <select style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} value={lead.state} onChange={e => setLeadField("state", e.target.value)}>
                          <option value="" disabled>State / Territory *</option>
                          {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "NZ"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </Field>
                      <Field label=""><input style={inputStyle} placeholder="Postcode *" value={lead.postcode} onChange={e => setLeadField("postcode", e.target.value)} /></Field>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0 24px" }} />

                {/* Payment */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Payment details</div>
                  <div id="card-element-container" style={{ padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, background: "#fff", transition: "border 0.2s, box-shadow 0.2s" }} />
                  {cardError && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{cardError}</div>}
                </div>

                {/* Terms */}
                <div onClick={() => setAgreed(!agreed)} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", padding: "12px 16px", borderRadius: 12, border: agreed ? "1px solid rgba(137,43,226,0.15)" : "1px solid transparent", background: agreed ? "rgba(137,43,226,0.03)" : "transparent", marginBottom: 20 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, border: `2px solid ${agreed ? BRAND : "#d1d5db"}`, background: agreed ? BRAND : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {agreed && <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>✓</span>}
                  </div>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>
                    I agree to the <a href="#" style={{ color: BRAND, fontWeight: 600 }} onClick={e => e.stopPropagation()}>Terms of Service</a> and <a href="#" style={{ color: BRAND, fontWeight: 600 }} onClick={e => e.stopPropagation()}>Privacy Policy</a>. I understand setup fees and the first month are charged today.
                  </p>
                </div>

                <button onClick={handlePayment} disabled={!agreed || processing || !leadValid} style={{ width: "100%", padding: "18px 0", background: agreed && !processing && leadValid ? "linear-gradient(135deg, #635bff 0%, #7c3aed 100%)" : "#d1d5db", color: "#fff", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: agreed && !processing && leadValid ? "pointer" : "not-allowed", boxShadow: agreed ? "0 4px 16px rgba(99,91,255,0.3)" : "none", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}>
                  {processing ? "Processing payment…" : `🔒 Pay ${fmt(grandTotal)} AUD`}
                </button>

                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  {fmt(totalSetup)} setup + {fmt(totalMonthly)} first month + {fmt(taxAmount)} GST charged today.<br />
                  Subsequent monthly billing of {fmt(totalMonthly)} +GST on the same date each month.
                </p>

                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                  {["🔒 256-bit SSL", "💳 Stripe Secured"].map(b => <div key={b} style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{b}</div>)}
                </div>
              </div>

              {/* Right: order summary */}
              <div style={{ flex: "1 1 280px", padding: 28, background: "#fafafa" }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 20 }}>Order summary</h3>
                {selectedBots.map((b, i) => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < selectedBots.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(b.price)}/mo recurring</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{fmt(b.setupFee)}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>setup</div>
                    </div>
                  </div>
                ))}

                <div style={{ height: 1, background: "#e5e7eb", margin: "16px 0" }} />
                {[["Setup fees", fmt(totalSetup)], ["First month", fmt(totalMonthly)], ["GST (10%)", fmt(taxAmount)]].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
                    <span style={{ color: "#6b7280" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
                  <span style={{ fontWeight: 800, color: "#111" }}>Due today</span>
                  <span style={{ fontWeight: 800, color: "#111", fontFamily: "monospace" }}>{fmt(grandTotal)}</span>
                </div>

                {/* Guarantee */}
                <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 12, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>🛡️</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Satisfaction Commitment</div>
                      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>If your bots aren't live within 10 business days of onboarding completion, we'll refund your setup fee in full.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MARKETPLACE VIEW ─────────────────────────────────────────────────────
  const allInputs = selectedBots.flatMap(b => b.inputs.map(inp => ({ ...inp, botId: b.id, botLabel: b.name })));

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Hero */}
      <div style={{ background: BRAND_GRADIENT, padding: "48px 24px 56px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -50, left: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", padding: "5px 16px", background: "rgba(255,255,255,0.15)", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 16, letterSpacing: "0.8px" }}>AI AGENCY INSTITUTE — REVENUE CALCULATOR</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>How much could AI make <em>your practice?</em></h1>
          <p style={{ margin: "0 auto", fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 540, lineHeight: 1.5 }}>Enter your numbers and select the bots you're considering to see your projected monthly revenue uplift.</p>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 20px 200px" }}>

        {/* Section 1: Bots */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Select the bots you want to implement</h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>Click to toggle each bot on or off. Minimum spend: {fmt(MIN_MONTHLY)}/mo.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {BOTS.map(bot => {
              const sel = selected.includes(bot.id);
              return (
                <div key={bot.id} onClick={() => toggle(bot.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 14, cursor: "pointer", border: sel ? `2px solid ${BRAND}` : "2px solid #e5e7eb", background: sel ? BRAND_LIGHT : "#fff", transition: "all 0.2s", boxShadow: sel ? `0 2px 12px rgba(137,43,226,0.12)` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: sel ? BRAND : "#e5e7eb", color: sel ? "#fff" : "#9ca3af", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{sel ? "✓" : "+"}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{bot.category} — {bot.name}</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{bot.description}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: BRAND }}>{fmt(bot.price)}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/mo</span></div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>+ {fmt(bot.setupFee)} <span style={{ fontWeight: 400 }}>setup</span></div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>+GST</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />

        {/* Section 2: Sliders */}
        {selectedBots.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Your practice numbers</h2>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>Adjust the sliders to match your practice.</p>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "8px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {allInputs.map(inp => (
                <InputRow key={`${inp.botId}-${inp.key}`} input={inp} value={inputs[inp.botId][inp.key]} onChange={val => updateInput(inp.botId, inp.key, val)} botLabel={inp.botLabel} />
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />

        {/* Section 3: Summary */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Your Revenue Opportunity</h2>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>Based on your numbers, conservatively estimated</p>
          {selectedBots.length === 0 ? (
            <div style={{ padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <p style={{ margin: 0, fontSize: 15 }}>Select at least one bot above to see your projected revenue</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ textAlign: "center", padding: "20px 0 24px", borderBottom: "2px solid #f3f4f6" }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>Additional monthly revenue</div>
                <div style={{ fontSize: 44, fontWeight: 800, color: BRAND, lineHeight: 1 }}>{fmt(totalRevenue)}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>+GST · per month</div>
              </div>
              <div style={{ padding: "16px 0", borderBottom: "2px solid #f3f4f6" }}>
                {selectedBots.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>{b.icon} {b.name}</span>
                    <span style={{ fontWeight: 600, color: "#111" }}>{fmt(revenues[b.id])}/mo</span>
                  </div>
                ))}
              </div>
              <div style={{ paddingTop: 16 }}>
                {[
                  ["Monthly investment", fmt(totalMonthly), BRAND_DARK, false],
                  ["Net gain per month", fmt(netGain), "#047857", true],
                  ["Annual uplift", fmt(totalRevenue * 12), "#047857", false],
                  ["Setup fee", fmt(totalSetup), "#111", false],
                  ["Setup payback", setupPayback && setupPayback > 0 ? `~${setupPayback} month${setupPayback > 1 ? "s" : ""}` : "—", "#111", false],
                  ["Return on investment", roi > 0 ? `${roi}x` : "—", BRAND, false],
                ].map(([label, value, color, large]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: 14, color: "#6b7280" }}>{label}</span>
                    <span style={{ fontSize: large ? 28 : 18, fontWeight: large ? 800 : 700, color: color as string }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: 16, padding: "12px 16px", background: BRAND_LIGHT, borderRadius: 10 }}>
                <span style={{ fontSize: 13, color: BRAND_DARK, fontWeight: 600 }}>
                  {roi > 0 ? `Every $1 you invest generates ${fmt(Math.round(roi * 100) / 100)}${roi >= 2 ? " 🚀" : ""}` : "Select bots above to calculate your return."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: CTA */}
        {selectedBots.length > 0 && totalMonthly >= MIN_MONTHLY && (
          <>
            <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", margin: "0 0 40px" }} />
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Ready to get started?</h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px" }}>Lock in your selected bots and we'll start building your AI systems.</p>
              <button onClick={goToCheckout} style={{ width: "100%", padding: "18px 0", background: BRAND_GRADIENT, color: "#fff", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 24px rgba(137,43,226,0.3)`, fontFamily: "'DM Sans', sans-serif" }}>
                Get Started — {fmt(totalMonthly)}/mo + {fmt(totalSetup)} setup →
              </button>
            </div>
          </>
        )}

        <div style={{ textAlign: "center", padding: "20px 0 40px", fontSize: 12, color: "#9ca3af" }}>
          Projections are estimates based on the inputs provided and industry benchmarks.<br />
          Results may vary. Prepared by <strong style={{ color: "#6b7280" }}>AI Agency Institute</strong> · aiagencyinstitute.com.au
        </div>
      </div>

      {/* Sticky bar */}
      {selectedBots.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "#fff", borderTop: "1px solid #e5e7eb", boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ maxWidth: 740, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "baseline", flexWrap: "wrap" }}>
              <div><span style={{ fontSize: 11, color: "#6b7280" }}>Investment </span><span style={{ fontSize: 20, fontWeight: 800, color: BRAND }}>{fmt(totalMonthly)}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/mo</span></span></div>
              <div><span style={{ fontSize: 11, color: "#6b7280" }}>Revenue </span><span style={{ fontSize: 18, fontWeight: 700, color: "#047857" }}>+{fmt(totalRevenue)}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/mo</span></span></div>
              <div><span style={{ fontSize: 11, color: "#6b7280" }}>ROI </span><span style={{ fontSize: 16, fontWeight: 700, color: BRAND }}>{roi}x</span></div>
            </div>
            {totalMonthly < MIN_MONTHLY && <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>Min. {fmt(MIN_MONTHLY)}/mo required</span>}
          </div>
        </div>
      )}
    </div>
  );
}
