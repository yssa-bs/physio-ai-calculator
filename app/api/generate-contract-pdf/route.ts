import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const BLACK  = rgb(0, 0, 0);
const GRAY   = rgb(0.4, 0.4, 0.4);
const LGRAY  = rgb(0.92, 0.92, 0.92);
const WHITE  = rgb(1, 1, 1);
const W = 595, H = 842, M = 56, CW = 595 - 56 * 2;

function fmt(n: number) { return "$" + Number(n).toLocaleString(); }

interface Bot { name: string; icon?: string; price: number; setupFee: number; }
interface Data {
  name: string; email: string; phone: string; position: string;
  businessName: string; abn: string; entityType: string;
  website: string; businessAddress: string; state: string; postcode: string;
  selectedBots: Bot[];
  totalMonthly: number; totalSetup: number; taxAmount: number; grandTotal: number;
  signatureName: string; signatureDate: string; signatureImage?: string;
  commencementDate: string;
}

async function buildPDF(d: Data): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const R = await doc.embedFont(StandardFonts.Helvetica);
  const B = await doc.embedFont(StandardFonts.HelveticaBold);
  const RI = await doc.embedFont(StandardFonts.HelveticaOblique);
  const BI = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  let page = doc.addPage([W, H]);
  let y = H - M;

  // ── helpers ──────────────────────────────────────────────────────────────
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const need = (n: number) => { if (y - n < M + 20) newPage(); };

  const text = (s: string, x: number, yy: number, font = R, size = 9, color = BLACK) =>
    page.drawText(s, { x, y: yy, font, size, color });

  const line = (x1: number, y1: number, x2: number, y2: number, t = 0.5, color = rgb(0.7,0.7,0.7)) =>
    page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2}, thickness:t, color });

  const rect = (x: number, yy: number, w: number, h: number, color = LGRAY) =>
    page.drawRectangle({ x, y: yy, width: w, height: h, color });

  // wrap + draw, returns new y
  const wrap = (s: string, x: number, startY: number, maxW: number, font = R, size = 9, color = BLACK, lh = 13): number => {
    const words = s.split(" ");
    let line_ = "", cy = startY;
    for (const w_ of words) {
      const test = line_ ? line_ + " " + w_ : w_;
      if (font.widthOfTextAtSize(test, size) <= maxW) { line_ = test; }
      else { if (line_) { text(line_, x, cy, font, size, color); cy -= lh; } line_ = w_; }
    }
    if (line_) { text(line_, x, cy, font, size, color); cy -= lh; }
    return cy;
  };

  // ── PAGE 1 HEADER ────────────────────────────────────────────────────────
  // Title block
  text("AI AGENCY INSTITUTE", M, y, B, 16);
  y -= 16;
  text("ABN 97 669 051 745", M, y, R, 9, GRAY);
  y -= 24;
  text("SERVICE AGREEMENT", M, y, B, 13);
  y -= 20;
  line(M, y, M + CW, y, 1, BLACK);
  y -= 16;

  // Intro paragraph
  y = wrap(
    "This Agreement is entered into between AI Agency Institute ABN 97 669 051 745 (Company) and you (the Client), collectively referred to as the Parties.",
    M, y, CW, R, 9
  ) - 8;

  // RECITALS
  text("RECITALS", M, y, B, 10);
  y -= 14;
  y = wrap("A. The Company has offered, and the Client has accepted, for the Company to provide the Client with AI-powered automation services (AI Bots) as detailed in the Schedule of Services below, on the terms and conditions of this Agreement.", M + 10, y, CW - 10, R, 9) - 6;
  y = wrap("B. By signing this Agreement, you are hereby accepting, acknowledging and agree to be bound by the terms of this Agreement.", M + 10, y, CW - 10, R, 9) - 14;

  // ── SCHEDULE OF SERVICES ─────────────────────────────────────────────────
  text("SCHEDULE OF SERVICES", M, y, B, 11);
  y -= 6;
  line(M, y, M + CW, y, 1, BLACK);
  y -= 14;

  const schedRows: [string, string, boolean][] = [
    ["Company:",          "AI Agency Institute",                                                  false],
    ["Service:",          "AI Bot Automation Services",                                           false],
    ["Client:",           d.name,                                                                 true],
    ["Position / Title:", d.position,                                                             true],
    ["Business Name:",    `${d.businessName}${d.entityType ? ` (${d.entityType})` : ""}`,         true],
    ["ABN:",              d.abn,                                                                  true],
    ["Address:",          `${d.businessAddress}, ${d.state} ${d.postcode}`,                       true],
    ["Monthly Fee:",      `${fmt(d.totalMonthly)} +GST per month`,                                true],
    ["Setup Fee:",        `${fmt(d.totalSetup)} +GST (one-time)`,                                 true],
    ["Commencement:",     d.commencementDate,                                                     true],
    ["Duration:",         "12 Months (auto-renewing)",                                            false],
  ];

  const ROW_H = 18, labelX = M + 6, valX = M + 160;
  const SPAD = 5;
  for (let i = 0; i < schedRows.length; i++) {
    const [label, val, italic] = schedRows[i];
    rect(M, y, CW, ROW_H, i % 2 === 0 ? LGRAY : WHITE);
    text(label, labelX, y + SPAD, B, 8.5);
    text(val, valX, y + SPAD, italic ? BI : B, 8.5);
    y -= ROW_H;
  }
  y -= 10;

  // Bot scope table
  text("Scope of Services — Selected AI Bots:", M, y, B, 9);
  y -= 12;

  // Bot table
  // Row height = 20px. rect() y is bottom-left. text() y is baseline.
  // For a row: rect at (y - 16), height 20 → top at y+4, text baseline at y
  const RH = 20;       // row height
  const PAD = 5;       // text padding from row bottom
  const PURPLE = rgb(0.537, 0.169, 0.886);
  const PURPLE_LIGHT = rgb(0.95, 0.88, 1.0);
  // Fixed column x positions (left-aligned)
  const C1 = M + 8;    // Bot name
  const C2 = M + 300;  // Monthly Fee
  const C3 = M + 410;  // Setup Fee

  // Draw a table row: bg rect + 3 text columns
  // rect(x, y, w, h) — y is BOTTOM of rect
  // text(s, x, y) — y is BASELINE of text
  // So: rect bottom = rowY, rect top = rowY + RH
  // Text baseline = rowY + PAD (sits PAD px above bottom of rect)
  const drawRow = (
    rowY: number, bg: ReturnType<typeof rgb>,
    col1: string, col2: string, col3: string,
    font: typeof R, size: number, color: ReturnType<typeof rgb>
  ) => {
    rect(M, rowY, CW, RH, bg);                    // bg rect: bottom=rowY, top=rowY+RH
    text(col1, C1, rowY + PAD, font, size, color); // text baseline inside rect
    text(col2, C2, rowY + PAD, font, size, color);
    text(col3, C3, rowY + PAD, font, size, color);
  };

  // Header row — draw then move y down by RH
  drawRow(y, PURPLE, "Bot", "Monthly Fee", "Setup Fee", B, 8.5, WHITE);
  y -= RH;

  // Data rows
  for (let i = 0; i < d.selectedBots.length; i++) {
    const bot = d.selectedBots[i];
    drawRow(y, i % 2 === 0 ? PURPLE_LIGHT : WHITE,
      bot.name, `${fmt(bot.price)}/mo`, fmt(bot.setupFee), R, 8.5, BLACK);
    y -= RH;
  }

  // Totals row
  drawRow(y, PURPLE,
    "Total", `${fmt(d.totalMonthly)}/mo`, fmt(d.totalSetup), B, 9, WHITE);
  y -= RH + 6;

  text("All amounts are in Australian Dollars (AUD) and are GST exclusive.", M, y, RI, 8, GRAY);
  y -= 20;

  // ── CLAUSES ──────────────────────────────────────────────────────────────
  const clauses = [
    { h: "1. THE SERVICES", subs: [
      { h: "1.1 Commencement and delivery of the Services", paras: [
        `(A) This Agreement commences on ${d.commencementDate} and continues for a minimum of 12 months, unless terminated in accordance with this Agreement.`,
        "(B) Upon completion of the initial twelve (12) month term, this Agreement will automatically renew for subsequent twelve (12) month periods unless either Party provides written notice of their intent not to renew at least thirty (30) days prior to the end of the then-current term.",
        "(C) Any anticipated completion date for the Services provided by the Company is an estimate only. The Company is not liable to the Client for any loss where the Services, or part of the Services, are not complete by the completion date.",
      ]},
      { h: "1.2 Additional Services", paras: [
        "(A) If the Client requires additional AI Bots or services, the Client must provide written notice outlining the additional Services requested. Within 5 Business Days, the Company must provide a notice detailing the proposed alteration, any additional cost, and any change to the completion date. The alteration is accepted when the Client confirms via email.",
      ]},
      { h: "1.3 Using the Services", paras: [
        "(A) The Client acknowledges that during the duration of this Agreement, the Client will be granted access to the proprietary AI bot platform utilised by the Company for the purpose of fulfilling the Services.",
        "(B) Upon termination of this Agreement, the Client will no longer have access to the AI bot platform. The Client will receive a CSV file encompassing all their leads and relevant information that was entered into or produced by the platform during the term of the Agreement.",
      ]},
    ]},
    { h: "2. OBLIGATIONS", subs: [
      { h: "2.1 The Client will:", paras: [
        "(A) act in good faith in all its dealings with the Company;",
        "(B) make the due and punctual payment of the Service Fee in full and without set-off as consideration for the provision of the Services;",
        "(C) promptly provide the Company with the requested information within the period of time requested, and where no period is specified, within a reasonable period of time;",
        "(D) not modify, misuse, record, reverse engineer, copy, duplicate, reproduce, create derivative works from, download, display, transmit or distribute any of the AI bot configurations, templated text, automations or copyright created by the Company;",
        "(E) not license, sell, rent, lease, transfer, assign or otherwise commercially exploit their access to the AI bot platform or the Services;",
        "(F) not engage in unlawful behaviour, including unauthorised access to or use of data, or access, store, distribute or transmit material that is unlawful, unethical, harmful, threatening, defamatory, or in contravention of the rights of any third party.",
      ]},
    ]},
    { h: "3. PAYMENT OF SERVICES & DEFAULT", subs: [
      { h: "3.1 Service Fee", paras: [
        `The Client is obligated to pay the monthly Service Fees of ${fmt(d.totalMonthly)} +GST per month for a minimum of twelve (12) consecutive months for the AI Bot Services listed in the Schedule of Services, along with a one-time setup fee of ${fmt(d.totalSetup)} +GST. The Company will issue a tax invoice for the initial setup fee, first month's retainer and ongoing monthly Service Fee. The Client consents to the direct debit of the Service Fee on a monthly basis until this Agreement is terminated.`,
      ]},
      { h: "3.2 Cancellation", paras: [
        "Where the Client requests termination of this Agreement prior to the completion of the 12-month period, the Client will be liable to pay the Service Fees corresponding to the full 12-month commitment, as initially contracted.",
      ]},
      { h: "3.3 Default Interest", paras: [
        "If the Client does not pay the Service Fee or if the direct debit is unsuccessful, the Company reserves the right to charge the Client a default interest of 10% per annum which will accrue daily on the outstanding Service Fee. The interest may be capitalised at monthly intervals and is payable on demand.",
      ]},
    ]},
    { h: "4. SUSPENSION OF SERVICES", subs: [
      { h: "", paras: ["(A) If the Client is in breach of this Agreement, the Company may suspend or terminate the provision of the Services."] },
    ]},
    { h: "5. INTELLECTUAL PROPERTY", subs: [
      { h: "5.1 Material", paras: [
        "The Company owns the Intellectual Property Rights (all past, present and future rights in relation to copyright, trademarks, designs, patents or other proprietary rights) created out of the performance of this Agreement and pre-existing material used by the Company, including but not limited to AI bot configurations, templated texts, automation workflows, designs and processes. The Company grants to the Client a non-exclusive, revocable and non-transferable licence to use Intellectual Property Rights for the purposes of realising the benefits of the Services.",
      ]},
    ]},
    { h: "6. CONFIDENTIALITY", subs: [
      { h: "", paras: [
        "6.1 The Parties must keep confidential and not disclose to any other person, confidential information, unless disclosure is required by law. The Parties may only use Confidential Information for the purpose of providing or receiving (as the case may be) the Services, unless otherwise agreed by the other Party in writing.",
      ]},
    ]},
    { h: "7. LIMITED LIABILITY", subs: [
      { h: "", paras: [
        "(A) The Company will not be liable to the Client for any direct, indirect, incidental, special, consequential, tort, or economic damages whatsoever (including, without limitation damages for loss of business, profits, savings, goodwill, business interruption, loss of business information, or any other pecuniary loss) which may be incurred by the Client arising out of the use of, or inability to use the Services. The Company limits its liability to the furthest extent permissible at law.",
        "(B) In all cases, the Company's liability arising out of or in connection with the Services or this Agreement, however arising, including under contract, tort (including negligence), in equity, under statute or otherwise, is limited to the re-performance of the Services.",
      ]},
    ]},
    { h: "8. INDEMNITY", subs: [
      { h: "", paras: [
        "8.1 The Client agrees to indemnify the Company, its affiliates, employees, agents, contributors, third party content providers and licensors from and against all actions, suits, claims, demands, liabilities, costs, expenses, loss and damage (including legal fees on a full indemnity basis) incurred, suffered or arising out of or in connection with:",
        "(A) the Services; (B) any breach of this Agreement; (C) any wilful misconduct by the Company; (D) any unlawful or negligent act or omission by the Client; or (E) any direct or indirect consequences of your use of the Services or attempts to do so.",
        "8.2 This indemnity will survive termination of this Agreement.",
      ]},
    ]},
    { h: "9. TERMINATION", subs: [
      { h: "", paras: [
        "(A) The Company may terminate this Agreement at any time.",
        "(B) The Client may terminate this Agreement for any reason by providing 30 days' notice in writing to the other party, acting reasonably.",
        "(C) The Client will be subject to the payment terms in clause 3.2 if this Agreement is terminated prior to the completion of the initial 12-month term.",
      ]},
    ]},
    { h: "10. GENERAL", subs: [
      { h: "", paras: [
        "10.1 No Partnership or Agency — Nothing in this Agreement creates or constitutes a partnership between the Parties. A Party must not act, represent or hold itself out as having authority to act as the agent of the other Party.",
        "10.2 Varied Agreement — This Agreement may only be varied by mutual written agreement.",
        "10.3 GST — Unless otherwise stated, all amounts expressed in connection with this Agreement are in Australian Dollars (AUD) and are GST exclusive.",
        "10.4 Governing Law & Jurisdiction — This Agreement is governed by the laws of NSW Australia. The exclusive venue for resolving any dispute will be in the courts of NSW.",
        "10.5 Severance — Any term of this Agreement that is wholly or partially void or unenforceable is severed to the extent that it is void or unenforceable. The validity of the remainder is not affected.",
      ]},
    ]},
  ];

  for (const clause of clauses) {
    need(30);
    text(clause.h, M, y, B, 10);
    y -= 6;
    line(M, y, M + CW, y, 0.8, BLACK);
    y -= 14;

    for (const sub of clause.subs) {
      if (sub.h) {
        need(16);
        text(sub.h, M, y, B, 9);
        y -= 13;
      }
      for (const para of sub.paras) {
        need(24);
        y = wrap(para, M + 10, y, CW - 10, R, 9, BLACK, 13) - 5;
      }
    }
    y -= 8;
  }

  // ── EXECUTION ────────────────────────────────────────────────────────────
  need(180);
  text("EXECUTION", M, y, B, 11);
  y -= 6;
  line(M, y, M + CW, y, 1, BLACK);
  y -= 16;

  const colW = (CW - 12) / 2;
  const col2 = M + colW + 12;
  const tableTop = y;
  const tableH = 130;

  // Draw two-column box
  rect(M, y - tableH, colW, tableH, rgb(0.98, 0.98, 0.98));
  rect(col2, y - tableH, colW, tableH, rgb(0.98, 0.98, 0.98));
  page.drawRectangle({ x: M, y: y - tableH, width: CW, height: tableH, borderColor: rgb(0.7,0.7,0.7), borderWidth: 0.5, opacity: 0 });
  line(M + colW + 6, y, M + colW + 6, y - tableH);

  // Company column
  text("THE COMPANY", M + 8, y - 10, B, 8, GRAY);
  text("AI Agency Institute", M + 8, y - 24, B, 9);
  text("ABN 97 669 051 745", M + 8, y - 36, R, 8, GRAY);
  text("Signature: _______________________________", M + 8, y - 58, R, 8);
  text("Name: _______________________________", M + 8, y - 76, R, 8);
  text("Date: _______________________________", M + 8, y - 94, R, 8);

  // Client column
  const clientBiz = `${d.businessName}${d.entityType ? ` (${d.entityType})` : ""}`;
  text("THE CLIENT", col2 + 8, y - 10, B, 8, GRAY);
  text(clientBiz, col2 + 8, y - 24, B, 9);
  text(`ABN ${d.abn}`, col2 + 8, y - 36, RI, 8, GRAY);

  // Signature image or typed name
  if (d.signatureImage && d.signatureImage.startsWith("data:image/png;base64,")) {
    try {
      const b64 = d.signatureImage.replace("data:image/png;base64,", "");
      const sigImg = await doc.embedPng(Buffer.from(b64, "base64"));
      page.drawImage(sigImg, { x: col2 + 8, y: y - 90, width: 130, height: 34 });
    } catch {
      text(`Signature: ${d.signatureName}`, col2 + 8, y - 76, BI, 9);
    }
  } else {
    // Typed name as cursive-style bold
    text(`Signed: ${d.signatureName}`, col2 + 8, y - 72, BI, 11);
  }

  text(`Name: ${d.signatureName}`, col2 + 8, y - 96, R, 8);
  text(`Date: ${d.signatureDate}`, col2 + 8, y - 110, R, 8);

  y -= tableH + 16;

  // Footer
  line(M, y, M + CW, y, 0.5, GRAY);
  y -= 12;
  text(`Electronically signed by ${d.signatureName} on ${d.signatureDate}`, M, y, R, 7.5, GRAY);
  text(`Generated: ${new Date().toLocaleDateString("en-AU")}`, M + CW - 100, y, R, 7.5, GRAY);

  return doc.save();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pdfBytes = await buildPDF(body);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // Fire to webhook
    const webhookUrl = process.env.GHL_CONTRACT_WEBHOOK_URL || process.env.GHL_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contract_signed",
          name: body.name,
          email: body.email,
          phone: body.phone,
          position: body.position,
          business_name: body.businessName,
          abn: body.abn,
          entity_type: body.entityType,
          website: body.website,
          business_address: `${body.businessAddress}, ${body.state} ${body.postcode}`,
          monthly_total: body.totalMonthly,
          setup_total: body.totalSetup,
          grand_total: body.grandTotal,
          selected_bots: body.selectedBots?.map((b: any) => b.name).join(", "),
          commencement_date: body.commencementDate,
          signature_name: body.signatureName,
          signature_date: body.signatureDate,
          contract_pdf_base64: pdfBase64,
          contract_pdf_filename: `AI_Agency_Service_Agreement_${(body.businessName || "").replace(/\s+/g, "_")}_${body.commencementDate}.pdf`,
        }),
      }).catch(e => console.error("Webhook error:", e));
      console.log("✅ Contract PDF sent to GHL for:", body.email);
    }

    // Return PDF for browser download
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="AI_Agency_Service_Agreement.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
