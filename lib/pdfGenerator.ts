import jsPDF from "jspdf";
import type { Flag, Recommendation } from "./generateReport";

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
 *
 * NOTE: callers that pass a callback which updates the outer `y` variable
 * should call cursor() without capturing the return value — the closure
 * update takes precedence over the returned START_Y.
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
  doc.setFillColor(C.white);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFontSize(90);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.orange);
  safeText(doc, "6", 105, 90, CONTENT_W, "center");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.textDark);
  safeText(doc, "CONSULT6", 105, 112, CONTENT_W, "center");

  doc.setDrawColor(C.orange);
  doc.setLineWidth(0.5);
  doc.line(85, 118, 125, 118);

  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textMid);
  safeText(doc, "Executive Consulting Report", 105, 126, CONTENT_W, "center");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.textDark);
  safeText(doc, orgName || "Your Organization", 105, 148, CONTENT_W, "center");

  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textLight);
  safeText(doc, dateStr, 105, 158, CONTENT_W, "center");

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

// ─── Flags page (What We Found) ───────────────────────────────────────────────

function drawFlags(
  doc: jsPDF,
  flags: Flag[],
  orgName: string,
  pageCounter: { current: number; total: number },
): void {
  drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
  let y = START_Y;
  y += drawHeader(doc, "WHAT WE FOUND", y) + 4;

  for (const flag of flags) {
    // Pre-measure total card height
    const titleH = LINE_H + 2;
    const descH = measureH(doc, flag.description, CONTENT_W - 8);
    const metricH = flag.metric
      ? measureH(doc, "Metric: " + flag.metric, CONTENT_W - 8)
      : 0;
    const totalH = titleH + descH + metricH + 14;

    // cursor() is called for its side effect (addPage + callback).
    // The callback updates the outer `y` via closure — do NOT assign
    // the return value or the closure's y update would be overwritten.
    cursor(y, totalH, doc, () => {
      pageCounter.current++;
      drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
      y = START_Y;
      y += drawHeader(doc, "WHAT WE FOUND", y) + 4;
    });

    // Severity colour
    const sevColor =
      flag.severity === "critical" ? C.critical
      : flag.severity === "warning" ? C.warning
      : C.info;

    // Dot: filled circle r=1.5mm centred at (MARGIN+1.5, y+2)
    doc.setFillColor(sevColor);
    doc.circle(MARGIN + 1.5, y + 2, 1.5, "F");

    // Severity label: BODY_SIZE-2 pt bold, same colour, at (MARGIN+5, y+3)
    doc.setFontSize(BODY_SIZE - 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(sevColor);
    const sevText = flag.severity.toUpperCase();
    safeText(doc, sevText, MARGIN + 5, y + 3, CONTENT_W - 5);

    // Measure severity label width while font is still at BODY_SIZE-2
    const sevW = doc.getTextWidth(sevText);

    // Title: BODY_SIZE pt bold C.textDark, immediately right of severity label
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.textDark);
    const titleX = MARGIN + 5 + sevW + 3;
    const titleMaxW = MARGIN + CONTENT_W - titleX;
    safeText(doc, flag.title, titleX, y + 3, titleMaxW);

    y += 7;

    // Description: BODY_SIZE pt normal C.textMid
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textMid);
    safeText(doc, flag.description, MARGIN + 5, y, CONTENT_W - 8);
    y += measureH(doc, flag.description, CONTENT_W - 8) + 2;

    // Metric (optional): BODY_SIZE-1 pt italic C.orange
    if (flag.metric) {
      const metricText = "Metric: " + flag.metric;
      doc.setFontSize(BODY_SIZE - 1);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(C.orange);
      safeText(doc, metricText, MARGIN + 5, y, CONTENT_W - 8);
      y += measureH(doc, metricText, CONTENT_W - 8) + 3;
    }

    // Separator rule then 6mm gap
    drawRule(doc, y, C.rule);
    y += 6;
  }
}

// ─── Recommendations page (What We'd Do) ─────────────────────────────────────

function drawRecommendations(
  doc: jsPDF,
  recs: Recommendation[],
  orgName: string,
  pageCounter: { current: number; total: number },
): void {
  doc.addPage();
  pageCounter.current++;
  drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
  let y = START_Y;
  y += drawHeader(doc, "WHAT WE'D DO", y) + 4;

  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i];

    // Pre-measure
    const titleH = LINE_H + 2;
    const detailH = measureH(doc, rec.detail, CONTENT_W - 10);
    const totalH = titleH + detailH + 10;

    // Page break — callback sets y = START_Y, cursor returns START_Y,
    // both agree so assigning is safe here. Closure update used for clarity.
    cursor(y, totalH, doc, () => {
      pageCounter.current++;
      drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
      y = START_Y;
    });

    // Number: BODY_SIZE+2 pt bold C.orange at (MARGIN, y+5)
    doc.setFontSize(BODY_SIZE + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.orange);
    safeText(doc, String(i + 1), MARGIN, y + 5, 8);

    // Title: BODY_SIZE pt bold C.textDark at (MARGIN+9, y+5)
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.textDark);
    safeText(doc, rec.title, MARGIN + 9, y + 5, CONTENT_W - 10);

    y += 8;

    // Detail: BODY_SIZE pt normal C.textMid at (MARGIN+9, y)
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textMid);
    safeText(doc, rec.detail, MARGIN + 9, y, CONTENT_W - 10);
    y += detailH + 3;

    // Orange rule between recs; plain gap after the last one
    if (i < recs.length - 1) {
      drawRule(doc, y, C.orange);
      y += 7;
    } else {
      y += 4;
    }
  }
}

export { safeText, measureH, cursor, drawFooter, drawHeader, drawRule };
export { drawCover, drawSummary, drawFlags, drawRecommendations };
export {
  PAGE_W, PAGE_H, MARGIN, CONTENT_W, CONTENT_BOTTOM, FOOTER_Y, START_Y,
  BODY_SIZE, HEADER_SIZE, LINE_H, HEADER_H, C,
};
