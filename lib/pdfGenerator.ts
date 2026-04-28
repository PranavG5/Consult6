import jsPDF from "jspdf";
import type { Flag, Recommendation, TrendData, IndustryComparison, Scenarios, RiskMatrixItem } from "./generateReport";

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
 * NOTE: when the callback updates the outer `y` variable beyond START_Y
 * (e.g. by also drawing a section header), call cursor() without capturing
 * the return value — the closure update takes precedence over the returned
 * START_Y.
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
    const titleH = LINE_H + 2;
    const descH = measureH(doc, flag.description, CONTENT_W - 8);
    const metricH = flag.metric
      ? measureH(doc, "Metric: " + flag.metric, CONTENT_W - 8)
      : 0;
    const totalH = titleH + descH + metricH + 14;

    // cursor() called without y= — callback advances y past the header;
    // cursor's START_Y return would overwrite that if assigned.
    cursor(y, totalH, doc, () => {
      pageCounter.current++;
      drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
      y = START_Y;
      y += drawHeader(doc, "WHAT WE FOUND", y) + 4;
    });

    const sevColor =
      flag.severity === "critical" ? C.critical
      : flag.severity === "warning" ? C.warning
      : C.info;

    doc.setFillColor(sevColor);
    doc.circle(MARGIN + 1.5, y + 2, 1.5, "F");

    doc.setFontSize(BODY_SIZE - 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(sevColor);
    const sevText = flag.severity.toUpperCase();
    safeText(doc, sevText, MARGIN + 5, y + 3, CONTENT_W - 5);
    const sevW = doc.getTextWidth(sevText);

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.textDark);
    const titleX = MARGIN + 5 + sevW + 3;
    safeText(doc, flag.title, titleX, y + 3, MARGIN + CONTENT_W - titleX);

    y += 7;

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textMid);
    safeText(doc, flag.description, MARGIN + 5, y, CONTENT_W - 8);
    y += measureH(doc, flag.description, CONTENT_W - 8) + 2;

    if (flag.metric) {
      const metricText = "Metric: " + flag.metric;
      doc.setFontSize(BODY_SIZE - 1);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(C.orange);
      safeText(doc, metricText, MARGIN + 5, y, CONTENT_W - 8);
      y += measureH(doc, metricText, CONTENT_W - 8) + 3;
    }

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
    const titleH = LINE_H + 2;
    const detailH = measureH(doc, rec.detail, CONTENT_W - 10);
    const totalH = titleH + detailH + 10;

    // Callback sets y = START_Y; cursor also returns START_Y — assignment safe.
    cursor(y, totalH, doc, () => {
      pageCounter.current++;
      drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
      y = START_Y;
    });

    doc.setFontSize(BODY_SIZE + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.orange);
    safeText(doc, String(i + 1), MARGIN, y + 5, 8);

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.textDark);
    safeText(doc, rec.title, MARGIN + 9, y + 5, CONTENT_W - 10);

    y += 8;

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textMid);
    safeText(doc, rec.detail, MARGIN + 9, y, CONTENT_W - 10);
    y += detailH + 3;

    if (i < recs.length - 1) {
      drawRule(doc, y, C.orange);
      y += 7;
    } else {
      y += 4;
    }
  }
}

// ─── Trajectory + chart page (Financial Trend) ────────────────────────────────

/** Parses a value that may arrive as a number or a formatted string. */
function parseNum(v: number | string): number {
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/[$,%]/g, "").replace(/,/g, "")) || 0;
}

function drawTrajectoryAndChart(
  doc: jsPDF,
  trajectoryText: string,
  trendData: TrendData,
  orgName: string,
  pageCounter: { current: number; total: number },
): void {
  doc.addPage();
  pageCounter.current++;
  drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
  let y = START_Y;
  y += drawHeader(doc, "FINANCIAL TREND", y) + 4;

  // Trajectory text
  doc.setFontSize(BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textMid);
  safeText(doc, trajectoryText, MARGIN, y, CONTENT_W);
  const trajH = measureH(doc, trajectoryText, CONTENT_W);
  y += trajH + 8;

  // Chart layout constants
  const chartX = MARGIN + 14;
  const chartW = CONTENT_W - 14;
  const chartH = 65;

  // Ensure the full chart block fits; callback sets y = START_Y, cursor also
  // returns START_Y — assignment safe here.
  y = cursor(y, chartH + 25, doc, () => {
    pageCounter.current++;
    drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
    y = START_Y;
  });
  const chartBottom = y + chartH;

  // Collect and validate values
  const s0vals = (trendData.series[0]?.values ?? []).map(parseNum);
  const s1vals = (trendData.series[1]?.values ?? []).map(parseNum);
  const allVals = [...s0vals, ...s1vals].filter(v => Number.isFinite(v) && v > 0);
  const rawMax = allVals.length > 0 ? Math.max(...allVals) : 0;
  const maxVal = Math.ceil(rawMax / 10000) * 10000;

  if (!maxVal || isNaN(maxVal)) {
    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textMid);
    safeText(doc, "Chart data unavailable", MARGIN, y, CONTENT_W);
    return;
  }

  // Gridlines + y-axis labels (0%, 25%, 50%, 75%, 100%)
  for (const pct of [0, 0.25, 0.5, 0.75, 1.0]) {
    const gridY = chartBottom - pct * chartH;
    doc.setDrawColor(C.rule);
    doc.setLineWidth(0.2);
    doc.line(chartX, gridY, chartX + chartW, gridY);
    const label = "$" + ((pct * maxVal) / 1000).toFixed(0) + "k";
    doc.setFontSize(BODY_SIZE - 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textLight);
    safeText(doc, label, MARGIN + 13, gridY + 1, 13, "right");
  }

  // Bars — always 6 groups, each with up to two bars
  const groupW = chartW / 6;
  const barW = groupW * 0.3;
  const n = Math.min(trendData.labels.length, 6);

  for (let i = 0; i < n; i++) {
    const bar1X = chartX + i * groupW + groupW * 0.05;
    const bar2X = bar1X + barW + 1.5;

    // Series 0 — Revenue (orange)
    const val1 = s0vals[i] ?? 0;
    const barH1 = Math.max((val1 / maxVal) * chartH, 0);
    doc.setFillColor(C.orange);
    doc.rect(bar1X, chartBottom - barH1, barW, barH1, "F");

    // Series 1 — Expenses (gray)
    if (trendData.series[1]) {
      const val2 = s1vals[i] ?? 0;
      const barH2 = Math.max((val2 / maxVal) * chartH, 0);
      doc.setFillColor("#9CA3AF");
      doc.rect(bar2X, chartBottom - barH2, barW, barH2, "F");
    }

    // X-axis label centred under its group
    const labelX = chartX + i * groupW + groupW / 2;
    doc.setFontSize(BODY_SIZE - 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textLight);
    safeText(doc, trendData.labels[i] ?? "", labelX, chartBottom + 5, groupW, "center");
  }

  // X-axis line
  doc.setDrawColor(C.textMid);
  doc.setLineWidth(0.5);
  doc.line(chartX, chartBottom, chartX + chartW, chartBottom);

  // Legend: two swatches centred on the page
  const legendY = chartBottom + 12;
  doc.setFillColor(C.orange);
  doc.rect(80, legendY, 5, 3, "F");
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textDark);
  safeText(doc, "Total Revenue", 87, legendY + 2, 30);

  doc.setFillColor("#9CA3AF");
  doc.rect(110, legendY, 5, 3, "F");
  doc.setFontSize(BODY_SIZE - 1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.textDark);
  safeText(doc, "Total Expenses", 117, legendY + 2, 30);

  y = chartBottom + 22;
}

// ─── Industry benchmarks page ─────────────────────────────────────────────────

function drawBenchmarks(
  doc: jsPDF,
  comps: IndustryComparison[],
  orgName: string,
  pageCounter: { current: number; total: number },
): void {
  doc.addPage();
  pageCounter.current++;
  drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
  let y = START_Y;
  y += drawHeader(doc, "INDUSTRY BENCHMARKS", y) + 4;

  const cols = [
    { label: "Metric",       w: 65, x: MARGIN },
    { label: "Your Value",   w: 35, x: 81 },
    { label: "Industry Avg", w: 30, x: 116 },
    { label: "Top 25%",      w: 18, x: 146 },
    { label: "Status",       w: 30, x: 164 },
  ];
  const rowH = 9;

  const drawTableHeader = (hy: number): number => {
    doc.setFillColor(C.orange);
    doc.rect(MARGIN, hy, CONTENT_W, rowH, "F");
    doc.setFontSize(BODY_SIZE - 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.white);
    for (const col of cols) {
      doc.text(col.label, col.x + 2, hy + 6);
    }
    return rowH;
  };

  y += drawTableHeader(y);

  for (let i = 0; i < comps.length; i++) {
    const comp = comps[i];

    // cursor() without y= — callback redraws section header + table header,
    // advancing y past START_Y; cursor's START_Y return would overwrite that.
    cursor(y, rowH, doc, () => {
      pageCounter.current++;
      drawFooter(doc, orgName, pageCounter.current, pageCounter.total);
      y = START_Y;
      y += drawHeader(doc, "INDUSTRY BENCHMARKS", y) + 4;
      y += drawTableHeader(y);
    });

    doc.setFillColor(i % 2 === 0 ? C.white : C.orangeLight);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");

    doc.setDrawColor(C.rule);
    doc.setLineWidth(0.2);
    for (const col of cols) {
      doc.rect(col.x, y, col.w, rowH, "S");
    }

    const statusStr =
      comp.status === "above_average" ? "Above Avg"
      : comp.status === "below_average" ? "Below Avg"
      : "Average";
    const statusColor =
      comp.status === "above_average" ? C.orange
      : comp.status === "below_average" ? C.critical
      : C.textMid;

    doc.setFontSize(BODY_SIZE - 1);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textDark);
    safeText(doc, comp.metric,          cols[0].x + 2, y + 6, cols[0].w - 4);
    safeText(doc, comp.yourValue,       cols[1].x + 2, y + 6, cols[1].w - 4);
    safeText(doc, comp.industryAverage, cols[2].x + 2, y + 6, cols[2].w - 4);
    safeText(doc, comp.topQuartile,     cols[3].x + 2, y + 6, cols[3].w - 4);
    doc.setTextColor(statusColor);
    doc.setFont("helvetica", "bold");
    safeText(doc, statusStr, cols[4].x + 2, y + 6, cols[4].w - 4);

    y += rowH;
  }
}

export { safeText, measureH, cursor, drawFooter, drawHeader, drawRule };
export { drawCover, drawSummary, drawFlags, drawRecommendations, drawTrajectoryAndChart, drawBenchmarks };
export {
  PAGE_W, PAGE_H, MARGIN, CONTENT_W, CONTENT_BOTTOM, FOOTER_Y, START_Y,
  BODY_SIZE, HEADER_SIZE, LINE_H, HEADER_H, C,
};
