import jsPDF from "jspdf";

// ─── Page geometry ────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297; // eslint-disable-line @typescript-eslint/no-unused-vars
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2; // 178mm
const CONTENT_BOTTOM = 268; // hard ceiling — nothing ever renders below this
const FOOTER_Y = 274;
const START_Y = 22; // where content begins after a page break

// ─── Typography ───────────────────────────────────────────────────────────────
const BODY_SIZE = 10; // ALL body text uses this size, no exceptions
const HEADER_SIZE = 13; // ALL section headers use this size, no exceptions
const LINE_H = 5.0; // mm per line at BODY_SIZE
const HEADER_H = 8; // height consumed by a section header including gap below

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  orange:      "#C2571A",
  orangeLight: "#FAEEE6",
  textDark:    "#111827",
  textMid:     "#374151",
  textLight:   "#9CA3AF",
  rule:        "#E5E7EB",
  white:       "#FFFFFF",
  critical:    "#DC2626",
  warning:     "#D97706",
  info:        "#2563EB",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Renders text clipped to maxWidth and the CONTENT_BOTTOM ceiling.
 * Each line is placed individually at y + i*LINE_H so spacing always
 * matches the LINE_H constant regardless of font size or jsPDF defaults.
 * Accepts an optional align option ("left" | "center" | "right").
 * Returns the number of lines actually rendered.
 */
function safeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align?: "left" | "center" | "right",
): number {
  if (y >= CONTENT_BOTTOM) return 0;
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  let rendered = 0;
  const opts = align && align !== "left" ? { align } : undefined;
  for (let i = 0; i < lines.length; i++) {
    const lineY = y + i * LINE_H;
    if (lineY >= CONTENT_BOTTOM) break;
    if (opts) {
      doc.text(lines[i], x, lineY, opts);
    } else {
      doc.text(lines[i], x, lineY);
    }
    rendered++;
  }
  return rendered;
}

/** Returns the height in mm that `text` would occupy at BODY_SIZE inside maxWidth. */
function measureH(doc: jsPDF, text: string, maxWidth: number): number {
  return (doc.splitTextToSize(text, maxWidth) as string[]).length * LINE_H;
}

/**
 * Checks whether `needed` mm fits below `y`.
 * If not, adds a new page, calls drawFooterFn(), and returns START_Y.
 * Otherwise returns y unchanged.
 * This is the ONLY place page breaks happen anywhere in the codebase.
 */
function cursor(
  y: number,
  needed: number,
  doc: jsPDF,
  drawFooterFn: () => void,
): number {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    drawFooterFn();
    return START_Y;
  }
  return y;
}

/**
 * Draws the page footer: white background, rule line, left/centre/right labels.
 * Intentionally uses raw doc.text() — footer lives below CONTENT_BOTTOM and
 * must bypass safeText's content-ceiling guard.
 */
function drawFooter(
  doc: jsPDF,
  orgName: string,
  pageNum: number,
  totalPages: number,
): void {
  doc.setFillColor(C.white);
  doc.rect(0, FOOTER_Y - 2, PAGE_W, 10, "F");

  doc.setDrawColor(C.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 3, MARGIN + CONTENT_W, FOOTER_Y - 3);

  doc.setFontSize(BODY_SIZE - 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textLight);
  doc.text(orgName, MARGIN, FOOTER_Y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, FOOTER_Y, { align: "center" });
  doc.text("Consult6", MARGIN + CONTENT_W, FOOTER_Y, { align: "right" });
}

/**
 * Draws an orange-bar section header.
 * Returns HEADER_H (8mm total consumed including gap below).
 */
function drawHeader(doc: jsPDF, label: string, y: number): number {
  doc.setFillColor(C.orange);
  doc.rect(MARGIN, y, 3, 5.5, "F");
  doc.setFontSize(HEADER_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.textDark);
  doc.text(label, MARGIN + 6, y + 4);
  return HEADER_H;
}

/**
 * Draws a 0.3pt horizontal rule at y across the full content width.
 * Returns 4 (mm consumed including gap below).
 */
function drawRule(doc: jsPDF, y: number, color: string): number {
  doc.setDrawColor(color);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  return 4;
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function drawCover(doc: jsPDF, orgName: string, dateStr: string): void {
  // White background
  doc.setFillColor(C.white);
  doc.rect(0, 0, 210, 297, "F");

  // Large "6" — 90pt bold orange, centered at (105, 90)
  doc.setFontSize(90);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.orange);
  safeText(doc, "6", 105, 90, CONTENT_W, "center");

  // "CONSULT6" — 18pt bold textDark, centered at y=112
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.textDark);
  safeText(doc, "CONSULT6", 105, 112, CONTENT_W, "center");

  // 0.5pt orange rule, 40mm wide, centered (x=85 to x=125) at y=118
  doc.setDrawColor(C.orange);
  doc.setLineWidth(0.5);
  doc.line(85, 118, 125, 118);

  // "Executive Consulting Report" — BODY_SIZE pt textMid, centered at y=126
  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textMid);
  safeText(doc, "Executive Consulting Report", 105, 126, CONTENT_W, "center");

  // Org name — 16pt bold textDark, centered at y=148
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.textDark);
  safeText(doc, orgName || "Your Organization", 105, 148, CONTENT_W, "center");

  // Date — BODY_SIZE pt textLight, centered at y=158
  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textLight);
  safeText(doc, dateStr, 105, 158, CONTENT_W, "center");

  // Tagline — (BODY_SIZE-1) pt textLight, centered at y=167
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textLight);
  safeText(
    doc,
    "Senior financial insight, no consultant required.",
    105,
    167,
    CONTENT_W,
    "center",
  );

  doc.addPage();
}

// ─── Executive summary page ───────────────────────────────────────────────────

function drawSummary(
  doc: jsPDF,
  summaryText: string,
  orgName: string,
  pageCounter: { current: number; total: number },
): void {
  drawFooter(doc, orgName, pageCounter.current, pageCounter.total);

  let y = START_Y;
  y += drawHeader(doc, "EXECUTIVE SUMMARY", y) + 4;

  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textDark);
  safeText(doc, summaryText, MARGIN, y, CONTENT_W);
}

export { safeText, measureH, cursor, drawFooter, drawHeader, drawRule };
export { drawCover, drawSummary };
export {
  PAGE_W, PAGE_H, MARGIN, CONTENT_W, CONTENT_BOTTOM, FOOTER_Y, START_Y,
  BODY_SIZE, HEADER_SIZE, LINE_H, HEADER_H, C,
};
