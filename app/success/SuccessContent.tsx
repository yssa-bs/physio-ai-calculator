"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const BRAND = "#892BE2";
const BRAND_GRADIENT = `linear-gradient(135deg, #892BE2 0%, #6b21a8 100%)`;

export default function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [dots, setDots] = useState(".");

  // Animated loading dots — just for polish
  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header bar */}
      <div
        style={{
          background: BRAND_GRADIENT,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.5,
          }}
        >
          AI AGENCY INSTITUTE
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "#fff",
            borderRadius: 24,
            border: "1px solid #e5e7eb",
            padding: "48px 40px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          {/* Checkmark */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#ecfdf5",
              border: "3px solid #a7f3d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              margin: "0 auto 24px",
            }}
          >
            ✅
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#111",
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}
          >
            Payment confirmed!
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "#6b7280",
              margin: "0 0 32px",
              lineHeight: 1.6,
            }}
          >
            Welcome aboard 🎉 Your AI bots are being set up. Our team will
            reach out within 24 hours to kick off your onboarding.
          </p>

          {/* What happens next */}
          <div
            style={{
              background: "#faf5ff",
              borderRadius: 16,
              border: "1px solid #e9d5ff",
              padding: "24px",
              textAlign: "left",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: BRAND,
                marginBottom: 16,
                letterSpacing: 0.5,
              }}
            >
              WHAT HAPPENS NEXT
            </div>
            {[
              {
                step: "1",
                title: "Confirmation email",
                desc: "Check your inbox — Stripe has sent your receipt.",
              },
              {
                step: "2",
                title: "Onboarding call",
                desc: "We'll book a kick-off call within 24 hours to gather your details.",
              },
              {
                step: "3",
                title: "Bot build",
                desc: "Your AI systems are configured, tested, and handed over within 5–10 business days.",
              },
              {
                step: "4",
                title: "Go live 🚀",
                desc: "Your practice starts capturing more revenue from day one.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: BRAND,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.step}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sessionId && (
            <p style={{ fontSize: 11, color: "#d1d5db", marginBottom: 24 }}>
              Reference: {sessionId}
            </p>
          )}

          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              background: BRAND_GRADIENT,
              color: "#fff",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(137,43,226,0.3)",
            }}
          >
            ← Back to Calculator
          </a>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        Questions? Email{" "}
        <a
          href="mailto:hello@aiagencyinstitute.com.au"
          style={{ color: BRAND }}
        >
          hello@aiagencyinstitute.com.au
        </a>
      </div>
    </div>
  );
}
