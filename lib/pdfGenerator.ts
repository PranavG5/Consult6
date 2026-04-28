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
 * Never renders text outside x to x+maxWidth, never below CONTENT_BOTTOM.
 * Returns the number of lines actually rendered.
 */
function safeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  if (y >= CONTENT_BOTTOM) return 0;
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  const visible = lines.filter(
    (_: string, i: number) => y + i * LINE_H < CONTENT_BOTTOM,
  );
  if (visible.length === 0) return 0;
  doc.text(visible, x, y);
  return visible.length;
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

/** Draws the page footer: white background, rule line, left/centre/right labels. */
function drawFooter(
  doc: jsPDF,
  orgName: string,
  pageNum: number,
  totalPages: number,
): void {
  // White background prevents content from bleeding into the footer area
  doc.setFillColor(C.white);
  doc.rect(0, FOOTER_Y - 2, PAGE_W, 10, "F");

  // Horizontal rule
  doc.setDrawColor(C.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 3, MARGIN + CONTENT_W, FOOTER_Y - 3);

  // Left / centre / right labels
  doc.setFontSize(BODY_SIZE - 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textLight);
  doc.text(orgName, MARGIN, FOOTER_Y);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, FOOTER_Y, {
    align: "center",
  });
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

// Page-rendering functions will be added in subsequent steps.
export { safeText, measureH, cursor, drawFooter, drawHeader, drawRule };
export {
  PAGE_W, PAGE_H, MARGIN, CONTENT_W, CONTENT_BOTTOM, FOOTER_Y, START_Y,
  BODY_SIZE, HEADER_SIZE, LINE_H, HEADER_H, C,
};
