import jsPDF from "jspdf";
import "jspdf-autotable";

// ─── Layout constants ────────────────────────────────────────────────────────
export const PAGE_W = 210;          // A4 width (mm)
export const PAGE_H = 297;          // A4 height (mm)
export const MARGIN = 15;           // page margin (mm), all sides
export const CONTENT_W = PAGE_W - MARGIN * 2;  // 180mm
export const FOOTER_Y = 284;        // footer rule y position
export const CONTENT_BOTTOM = FOOTER_Y - 4;    // 280mm — content cutoff
export const START_Y = 25;          // top y for content on each page

// ─── Font sizes (pt) ─────────────────────────────────────────────────────────
export const FONT_SIZES = {
  coverTitle: 120,
  coverSub:    22,
  sectionHeader: 13,
  cardTitle:   11,
  body:         9.5,
  small:        8.5,
  tiny:         7.5,
};

// ─── Colors (RGB tuples) ─────────────────────────────────────────────────────
export type RGB = [number, number, number];
export const COLORS = {
  navy:           [10,  22,  40] as RGB,  // #0a1628
  blue:           [59, 130, 246] as RGB,  // #3b82f6
  red:            [239, 68,  68] as RGB,  // #ef4444
  green:          [34, 197,  94] as RGB,  // #22c55e
  amber:          [245, 158, 11] as RGB,  // #f59e0b
  orange:         [249, 115, 22] as RGB,  // #f97316
  textDark:       [30,  41,  59] as RGB,  // #1e293b
  textMid:        [100, 116, 139] as RGB, // #64748b
  textLight:      [148, 163, 184] as RGB, // #94a3b8
  white:          [255, 255, 255] as RGB,
  pageBg:         [255, 255, 255] as RGB,
  border:         [226, 232, 240] as RGB, // #e2e8f0
  cardBg:         [248, 250, 252] as RGB, // #f8fafc
  criticalBg:     [254, 242, 242] as RGB, // #fef2f2
  criticalBorder: [239,  68,  68] as RGB,
  warningBg:      [255, 251, 235] as RGB, // #fffbeb
  warningBorder:  [245, 158,  11] as RGB,
  infoBg:         [239, 246, 255] as RGB, // #eff6ff
  infoBorder:     [ 59, 130, 246] as RGB,
  highBg:         [254, 226, 226] as RGB, // #fee2e2
  highTxt:        [153,  27,  27] as RGB,
  medBg:          [254, 249, 195] as RGB, // #fef9c3
  medTxt:         [133,  77,  14] as RGB,
  lowBg:          [220, 252, 231] as RGB, // #dcfce7
  lowTxt:         [ 21, 128,  61] as RGB,
  rowAlt:         [248, 250, 252] as RGB,
};

// ─── Sanitize (strip Unicode incompatible with jsPDF Helvetica) ──────────────
export function sanitize(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[→➜➡↗]/g, "->")
    .replace(/[↓⬇▼▽↘]/g, "(down)")
    .replace(/[↑⬆▲△]/g, "(up)")
    .replace(/[←⬅]/g, "<-")
    .replace(/[◆◇•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/!'/g, ">")
    .replace(/%¼/g, "to")
    .replace(/[^\x00-\x7E]/g, "");
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface Flag { title: string; severity: "critical"|"warning"|"info"; description: string; metric?: string; }
export interface Recommendation { title: string; detail: string; priority: "high"|"medium"|"low"; }
export interface TrendSeries { name: string; values: (number|string)[]; }
export interface TrendData { label: string; series: TrendSeries[]; labels: string[]; }
export interface IndustryComparison { metric: string; yourValue: string; industryAverage: string; topQuartile: string; status: string; }
export interface CaseStudy { organization: string; challenge: string; solution: string; outcome: string; source?: string; }
export interface Scenarios { optimistic: string; base: string; pessimistic: string; }
export interface RiskMatrixItem { risk: string; likelihood: "high"|"medium"|"low"; impact: "high"|"medium"|"low"; mitigation: string; }
export interface ActionPlan { immediate: string[]; shortTerm: string[]; longTerm: string[]; }
export interface AnalysisResult {
  summary: string; flags: Flag[]; recommendations: Recommendation[];
  trajectoryNote: string; trendData?: TrendData; industryComparisons?: IndustryComparison[];
  caseStudies?: CaseStudy[]; scenarios?: Scenarios; riskMatrix?: RiskMatrixItem[]; actionPlan?: ActionPlan;
}
export interface ReportData { orgName: string; fileName: string; generatedAt: string; mode: string; analysis: AnalysisResult; }

// ─── Helper: add a fresh page with white background ──────────────────────────
export function addNewPage(doc: jsPDF): number {
  doc.addPage();
  doc.setFillColor(...COLORS.pageBg);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  return START_Y;
}

// ─── Helper: draw footer (called in final pass once total pages is known) ────
export function drawFooter(doc: jsPDF, orgName: string, pageNum: number, totalPages: number): void {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y, PAGE_W - MARGIN, FOOTER_Y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.tiny);
  doc.setTextColor(...COLORS.textLight);

  const cleanOrg = sanitize(orgName).trim();
  const left = cleanOrg ? `${cleanOrg} - Executive Consulting Report` : "Executive Consulting Report";
  doc.text(left, MARGIN, FOOTER_Y + 4);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, FOOTER_Y + 4, { align: "center" });
  doc.text("Consult6 - Senior financial insight, no consultant required.", PAGE_W - MARGIN, FOOTER_Y + 4, { align: "right" });
}

// ─── Helper: draw section header — returns height consumed (mm) ──────────────
export function drawSectionHeader(doc: jsPDF, label: string, y: number): number {
  doc.setFillColor(...COLORS.blue);
  doc.rect(MARGIN, y, 3, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_SIZES.sectionHeader);
  doc.setTextColor(...COLORS.navy);
  doc.text(sanitize(label), MARGIN + 6, y + 5);

  return 13; // 7mm bar + 6mm trailing gap
}

// ─── Helper: measure wrapped text height in mm ───────────────────────────────
export function measureTextHeight(doc: jsPDF, text: string, fontSize: number, maxWidth: number): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(sanitize(text), maxWidth) as string[];
  // pt -> mm conversion (0.352778) with 1.45 line spacing
  const lineH = fontSize * 0.352778 * 1.45;
  return lines.length * lineH;
}

// ─── Helper: draw a card (filled rounded rect with border) ───────────────────
export function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, bg: RGB, border: RGB): void {
  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
}

// ─── Helper: draw a single flag card — returns total height consumed ────────
function drawFlag(doc: jsPDF, flag: Flag, y: number): number {
  const sev = flag.severity;
  const bg     = sev === "critical" ? COLORS.criticalBg     : sev === "warning" ? COLORS.warningBg     : COLORS.infoBg;
  const border = sev === "critical" ? COLORS.criticalBorder : sev === "warning" ? COLORS.warningBorder : COLORS.infoBorder;
  const label  = sev.toUpperCase();
  const badgeW = label.length * 2.4 + 8;

  // Wrap text and measure
  const titleLines  = doc.splitTextToSize(sanitize(flag.title),       CONTENT_W - badgeW - 16) as string[];
  const descLines   = doc.splitTextToSize(sanitize(flag.description), CONTENT_W - 12)          as string[];
  const titleLH = FONT_SIZES.cardTitle * 0.352778 * 1.45;
  const bodyLH  = FONT_SIZES.body      * 0.352778 * 1.45;
  const smallLH = FONT_SIZES.small     * 0.352778 * 1.45;

  const titleH  = titleLines.length * titleLH;
  const descH   = descLines.length  * bodyLH;
  const metricH = flag.metric ? smallLH + 2 : 0;
  const cardH   = Math.max(22, titleH + descH + metricH + 16);

  // Card background + border
  drawCard(doc, MARGIN, y, CONTENT_W, cardH, bg, border);

  // Severity badge
  doc.setFillColor(...border);
  doc.roundedRect(MARGIN + 4, y + 5, badgeW, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.white);
  doc.text(label, MARGIN + 4 + badgeW / 2, y + 10.2, { align: "center" });

  // Title (right of badge, may wrap)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_SIZES.cardTitle);
  doc.setTextColor(...COLORS.textDark);
  doc.text(titleLines, MARGIN + 4 + badgeW + 6, y + 10);

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.textMid);
  doc.text(descLines, MARGIN + 6, y + titleH + 14);

  // Metric (italic, bottom)
  if (flag.metric) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...border);
    doc.text(`Metric: ${sanitize(flag.metric)}`, MARGIN + 6, y + cardH - 4);
  }

  return cardH;
}

// ─── Helper: draw a numbered recommendation card ────────────────────────────
function drawRecommendation(doc: jsPDF, rec: Recommendation, idx: number, y: number): number {
  const numW = 14;  // space reserved for number circle
  const titleLines  = doc.splitTextToSize(sanitize(rec.title),  CONTENT_W - numW - 8) as string[];
  const detailLines = doc.splitTextToSize(sanitize(rec.detail), CONTENT_W - numW - 8) as string[];
  const titleLH = FONT_SIZES.cardTitle * 0.352778 * 1.45;
  const bodyLH  = FONT_SIZES.body      * 0.352778 * 1.45;

  const titleH  = titleLines.length  * titleLH;
  const detailH = detailLines.length * bodyLH;
  const cardH   = Math.max(22, titleH + detailH + 14);

  drawCard(doc, MARGIN, y, CONTENT_W, cardH, COLORS.cardBg, COLORS.border);

  // Number circle
  doc.setFillColor(...COLORS.blue);
  doc.circle(MARGIN + 8, y + 10, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.text(String(idx + 1), MARGIN + 8, y + 12.5, { align: "center" });

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_SIZES.cardTitle);
  doc.setTextColor(...COLORS.textDark);
  doc.text(titleLines, MARGIN + numW + 2, y + 10);

  // Detail
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.textMid);
  doc.text(detailLines, MARGIN + numW + 2, y + titleH + 12);

  return cardH;
}

// ─── Page: What We Found (flags) ─────────────────────────────────────────────
function renderFlags(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.flags?.length) return;

  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "WHAT WE FOUND", y);
  y += 4;

  const GAP = 4;
  for (const flag of data.analysis.flags) {
    // Pre-measure to know if it fits
    const sev = flag.severity;
    const label  = sev.toUpperCase();
    const badgeW = label.length * 2.4 + 8;
    const titleLines = doc.splitTextToSize(sanitize(flag.title),       CONTENT_W - badgeW - 16) as string[];
    const descLines  = doc.splitTextToSize(sanitize(flag.description), CONTENT_W - 12)          as string[];
    const titleLH = FONT_SIZES.cardTitle * 0.352778 * 1.45;
    const bodyLH  = FONT_SIZES.body      * 0.352778 * 1.45;
    const smallLH = FONT_SIZES.small     * 0.352778 * 1.45;
    const cardH = Math.max(22,
      titleLines.length * titleLH +
      descLines.length  * bodyLH  +
      (flag.metric ? smallLH + 2 : 0) + 16
    );

    if (y + cardH > CONTENT_BOTTOM) {
      y = addNewPage(doc);  // no repeated section header per spec
    }

    const drawn = drawFlag(doc, flag, y);
    y += drawn + GAP;
  }
}

// ─── Page: What We'd Do (recommendations) ────────────────────────────────────
function renderRecommendations(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.recommendations?.length) return;

  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "WHAT WE'D DO", y);
  y += 4;

  const GAP = 4;
  data.analysis.recommendations.forEach((rec, i) => {
    const numW = 14;
    const titleLines  = doc.splitTextToSize(sanitize(rec.title),  CONTENT_W - numW - 8) as string[];
    const detailLines = doc.splitTextToSize(sanitize(rec.detail), CONTENT_W - numW - 8) as string[];
    const titleLH = FONT_SIZES.cardTitle * 0.352778 * 1.45;
    const bodyLH  = FONT_SIZES.body      * 0.352778 * 1.45;
    const cardH = Math.max(22,
      titleLines.length  * titleLH +
      detailLines.length * bodyLH  + 14
    );

    if (y + cardH > CONTENT_BOTTOM) {
      y = addNewPage(doc);
    }

    const drawn = drawRecommendation(doc, rec, i, y);
    y += drawn + GAP;
  });
}

// ─── Helper: parse numeric value from string or number ──────────────────────
function parseNum(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v).replace(/[$,%]/g, "").replace(/,/g, "");
  return parseFloat(s);
}

// ─── Page: Trajectory + Chart ────────────────────────────────────────────────
function renderTrajectoryAndChart(doc: jsPDF, data: ReportData): void {
  const CHART_H = 75;   // chart area height in mm
  const CHART_LEGEND_H = 14;

  // ── Trajectory box ──────────────────────────────────────────────────────
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "WHERE THIS IS HEADING", y);
  y += 4;

  const trajText  = sanitize(data.analysis.trajectoryNote);
  const trajLines = doc.splitTextToSize(trajText, CONTENT_W - 10) as string[];
  const bodyLH    = FONT_SIZES.body * 0.352778 * 1.45;
  const trajBoxH  = Math.max(22, trajLines.length * bodyLH + 14);

  drawCard(doc, MARGIN, y, CONTENT_W, trajBoxH, COLORS.cardBg, COLORS.border);
  doc.setFillColor(...COLORS.blue);
  doc.rect(MARGIN, y, 3, trajBoxH, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.textDark);
  doc.text(trajLines, MARGIN + 8, y + bodyLH + 2);
  y += trajBoxH + 8;

  // ── Chart ────────────────────────────────────────────────────────────────
  if (data.mode !== "advanced" || !data.analysis.trendData) return;

  const td      = data.analysis.trendData;
  const wordCnt = (data.analysis.trajectoryNote || "").split(/\s+/).filter(Boolean).length;
  const chartTotalH = CHART_H + CHART_LEGEND_H + 18;

  // Move to new page if trajectory was long or chart won't fit
  if (wordCnt >= 120 || y + chartTotalH > CONTENT_BOTTOM) {
    y = addNewPage(doc);
    y += drawSectionHeader(doc, "FINANCIAL TREND", y);
    y += 4;
  }

  const allVals = td.series
    .flatMap(s => (Array.isArray(s.values) ? s.values : []).map(parseNum))
    .filter(Number.isFinite)
    .filter(v => v > 0);

  if (!allVals.length) {
    drawCard(doc, MARGIN, y, CONTENT_W, 20, COLORS.cardBg, COLORS.border);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(...COLORS.textMid);
    doc.text("Chart data unavailable", PAGE_W / 2, y + 12, { align: "center" });
    return;
  }

  const maxVal  = Math.max(...allVals);
  const maxR    = Math.ceil(maxVal / 10000) * 10000 || 10000;
  const n       = td.labels.length;
  const yAxisW  = 18;
  const chartX  = MARGIN + yAxisW;
  const chartW  = CONTENT_W - yAxisW;
  const chartBottom = y + CHART_H;
  const seriesCols: RGB[] = [COLORS.blue, COLORS.red, COLORS.orange];

  // Chart background card
  drawCard(doc, MARGIN, y - 2, CONTENT_W, CHART_H + CHART_LEGEND_H + 10, COLORS.cardBg, COLORS.border);

  // Gridlines + y-axis labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.tiny);
  for (let t = 0; t <= 4; t++) {
    const tickVal = Math.round((maxR / 4) * t);
    const tickY   = chartBottom - (tickVal / maxR) * CHART_H;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(chartX, tickY, chartX + chartW, tickY);
    const lbl = tickVal === 0 ? "$0" : `$${tickVal / 1000}k`;
    doc.setTextColor(...COLORS.textLight);
    doc.text(lbl, chartX - 2, tickY + 1, { align: "right" });
  }

  // Axes
  doc.setDrawColor(...COLORS.textMid);
  doc.setLineWidth(0.4);
  doc.line(chartX, y, chartX, chartBottom);
  doc.line(chartX, chartBottom, chartX + chartW, chartBottom);

  // Bars (grouped, grow upward)
  if (n > 0) {
    const groupW    = chartW / n;
    const numSeries = Math.min(td.series.length, 2);
    const totalBarW = groupW * 0.65;
    const barGap    = numSeries > 1 ? 1.5 : 0;
    const singleW   = Math.max(2, (totalBarW - barGap * (numSeries - 1)) / numSeries);

    for (let si = 0; si < numSeries; si++) {
      const vals = (Array.isArray(td.series[si].values) ? td.series[si].values : []).map(parseNum);
      doc.setFillColor(...seriesCols[si]);
      vals.forEach((v, j) => {
        if (!Number.isFinite(v) || v <= 0) return;
        const barH = (v / maxR) * CHART_H;
        const gLeft = chartX + j * groupW + (groupW - totalBarW) / 2;
        const bx    = gLeft + si * (singleW + barGap);
        doc.rect(bx, chartBottom - barH, singleW, barH, "F");
      });
    }

    // X-axis labels
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZES.tiny);
    doc.setTextColor(...COLORS.textMid);
    td.labels.forEach((lbl, j) => {
      const gMid = chartX + j * groupW + groupW / 2;
      doc.text(sanitize(lbl), gMid, chartBottom + 5, { align: "center" });
    });
  }

  // Legend
  const legendY    = chartBottom + 12;
  const usedSeries = td.series.slice(0, 2);
  const legendW    = usedSeries.length * 72;
  let lx           = (PAGE_W - legendW) / 2;
  usedSeries.forEach((s, si) => {
    doc.setFillColor(...seriesCols[si]);
    doc.rect(lx, legendY - 3, 4, 4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...COLORS.textDark);
    doc.text(sanitize(s.name), lx + 6, legendY);
    lx += 72;
  });
}

// ─── Page: Benchmarks ────────────────────────────────────────────────────────
function renderBenchmarks(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.industryComparisons?.length) return;
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "HOW YOU COMPARE", y);
  y += 4;

  (doc as any).autoTable({
    startY: y,
    head: [["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"]],
    body: data.analysis.industryComparisons.map(c => [
      sanitize(c.metric), sanitize(c.yourValue), sanitize(c.industryAverage),
      sanitize(c.topQuartile),
      c.status === "above_average" ? "Above Avg" : c.status === "below_average" ? "Below Avg" : "Average",
    ]),
    theme: "plain",
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 10, minCellHeight: 10, valign: "middle" },
    bodyStyles: { fillColor: COLORS.pageBg, textColor: COLORS.textDark, fontSize: FONT_SIZES.small, lineWidth: 0.2, lineColor: COLORS.border, minCellHeight: 12, cellPadding: 3 },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    styles: { overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 65, halign: "left"   as const },
      1: { cellWidth: 35, halign: "center" as const },
      2: { cellWidth: 35, halign: "center" as const },
      3: { cellWidth: 22, halign: "center" as const },
      4: { cellWidth: 23, halign: "center" as const },
    },
    didParseCell: (d: any) => {
      if (d.section === "body" && d.column.index === 4) {
        const v: string = d.cell.raw?.toString() ?? "";
        d.cell.styles.fontStyle = "bold";
        if (v === "Above Avg")      d.cell.styles.textColor = COLORS.blue;
        else if (v === "Below Avg") d.cell.styles.textColor = COLORS.red;
        else                        d.cell.styles.textColor = COLORS.textMid;
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

// ─── Page: Case Studies ───────────────────────────────────────────────────────
function renderCaseStudies(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.caseStudies?.length) return;
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "WHO'S BEEN HERE BEFORE", y);
  y += 4;

  for (const cs of data.analysis.caseStudies) {
    if (y + 50 > CONTENT_BOTTOM) { y = addNewPage(doc); y += 4; }

    // Org name bar
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(MARGIN, y, CONTENT_W, 11, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZES.cardTitle);
    doc.setTextColor(...COLORS.white);
    doc.text(sanitize(cs.organization), MARGIN + 6, y + 7.5);
    y += 11;

    (doc as any).autoTable({
      startY: y,
      head: [["Challenge", "Solution", "Outcome"]],
      body: [[sanitize(cs.challenge), sanitize(cs.solution), sanitize(cs.outcome)]],
      theme: "plain",
      headStyles: { fillColor: COLORS.cardBg, textColor: COLORS.textMid, fontStyle: "bold", fontSize: FONT_SIZES.small, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 } },
      bodyStyles: { fillColor: COLORS.pageBg, textColor: COLORS.textDark, fontSize: FONT_SIZES.body, lineWidth: 0.2, lineColor: COLORS.border, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 } },
      styles: { overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 60, halign: "left" as const },
        1: { cellWidth: 60, halign: "left" as const },
        2: { cellWidth: 60, halign: "left" as const },
      },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = (doc as any).lastAutoTable.finalY;

    if (cs.source) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(FONT_SIZES.tiny);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`Source: ${sanitize(cs.source)}`, MARGIN, y + 4);
      y += 7;
    }
    y += 6;
  }
}

// ─── Page: Scenarios ─────────────────────────────────────────────────────────
function renderScenarios(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.scenarios) return;
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "HOW THIS COULD PLAY OUT", y);
  y += 4;

  const boxW = (CONTENT_W - 8) / 3;
  const scens = [
    { label: "OPTIMISTIC",  text: data.analysis.scenarios.optimistic,  col: COLORS.green },
    { label: "BASE CASE",   text: data.analysis.scenarios.base,         col: COLORS.blue  },
    { label: "PESSIMISTIC", text: data.analysis.scenarios.pessimistic,  col: COLORS.red   },
  ];

  let fs = FONT_SIZES.small;
  const measure = (fontSize: number) => scens.map(s => {
    const ls = doc.splitTextToSize(sanitize(s.text), boxW - 10) as string[];
    return ls.length * (fontSize * 0.352778 * 1.45);
  });

  let heights = measure(fs);
  if (Math.max(...heights) + 20 > 80) { fs = FONT_SIZES.tiny; heights = measure(fs); }
  const boxH = Math.max(40, Math.max(...heights) + 20);

  scens.forEach((s, i) => {
    const sx = MARGIN + i * (boxW + 4);
    drawCard(doc, sx, y, boxW, boxH, COLORS.cardBg, s.col);
    doc.setFillColor(...s.col);
    doc.rect(sx, y, boxW, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT_SIZES.small);
    doc.setTextColor(...s.col);
    doc.text(s.label, sx + 5, y + 10);
    const bodyL = doc.splitTextToSize(sanitize(s.text), boxW - 10) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs);
    doc.setTextColor(...COLORS.textDark);
    doc.text(bodyL, sx + 5, y + 18);
  });
}

// ─── Page: Risk Matrix ────────────────────────────────────────────────────────
function renderRiskMatrix(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.riskMatrix?.length) return;
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "WHAT WE'RE WATCHING", y);
  y += 4;

  (doc as any).autoTable({
    startY: y,
    head: [["Risk", "Likelihood", "Impact", "Mitigation"]],
    body: data.analysis.riskMatrix.map(r => [
      sanitize(r.risk), r.likelihood.toUpperCase(), r.impact.toUpperCase(), sanitize(r.mitigation),
    ]),
    theme: "plain",
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 9, minCellHeight: 10, valign: "middle" },
    bodyStyles: { fillColor: COLORS.pageBg, textColor: COLORS.textDark, fontSize: FONT_SIZES.small, lineWidth: 0.2, lineColor: COLORS.border, minCellHeight: 14, cellPadding: 3 },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
    styles: { overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 68, halign: "left"   as const },
      1: { cellWidth: 22, halign: "center" as const },
      2: { cellWidth: 22, halign: "center" as const },
      3: { cellWidth: 68, halign: "left"   as const },
    },
    didParseCell: (d: any) => {
      if (d.section === "body" && (d.column.index === 1 || d.column.index === 2)) {
        const v = d.cell.raw?.toString().toLowerCase();
        if (v === "high")   { d.cell.styles.fillColor = COLORS.highBg; d.cell.styles.textColor = COLORS.highTxt; d.cell.styles.fontStyle = "bold"; }
        else if (v === "medium") { d.cell.styles.fillColor = COLORS.medBg;  d.cell.styles.textColor = COLORS.medTxt;  d.cell.styles.fontStyle = "bold"; }
        else if (v === "low")    { d.cell.styles.fillColor = COLORS.lowBg;  d.cell.styles.textColor = COLORS.lowTxt;  d.cell.styles.fontStyle = "bold"; }
      }
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

// ─── Page: Action Plan ────────────────────────────────────────────────────────
function renderActionPlan(doc: jsPDF, data: ReportData): void {
  if (!data.analysis.actionPlan) return;
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "YOUR NEXT STEPS", y);
  y += 4;

  const phases = [
    { label: "IMMEDIATE (0-30 DAYS)",   items: data.analysis.actionPlan.immediate,  col: COLORS.red    },
    { label: "SHORT-TERM (30-90 DAYS)", items: data.analysis.actionPlan.shortTerm,  col: COLORS.orange },
    { label: "LONG-TERM (90+ DAYS)",    items: data.analysis.actionPlan.longTerm,   col: COLORS.blue   },
  ];

  for (const phase of phases) {
    if (y + 18 > CONTENT_BOTTOM) { y = addNewPage(doc); y += 4; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...phase.col);
    doc.text(phase.label, MARGIN, y + 5);
    y += 12;

    for (const item of phase.items) {
      const wrapped = doc.splitTextToSize(`- ${sanitize(item)}`, CONTENT_W - 10) as string[];
      const itemH   = Math.max(10, wrapped.length * (FONT_SIZES.body * 0.352778 * 1.45) + 6);
      if (y + itemH > CONTENT_BOTTOM) { y = addNewPage(doc); y += 4; }
      drawCard(doc, MARGIN, y, CONTENT_W, itemH, COLORS.cardBg, COLORS.border);
      doc.setFillColor(...phase.col);
      doc.rect(MARGIN, y, 3, itemH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT_SIZES.body);
      doc.setTextColor(...COLORS.textDark);
      doc.text(wrapped, MARGIN + 7, y + 5);
      y += itemH + 3;
    }
    y += 8;
  }
}

// ─── Page: Cover ─────────────────────────────────────────────────────────────
function renderCover(doc: jsPDF, data: ReportData): void {
  // Prime text engine — prevents stray artifact on first doc.text() call
  doc.setFontSize(1);
  doc.setTextColor(...COLORS.navy);
  doc.text(" ", 1, 1);

  // Full-bleed navy background
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  // Large "6" — 120pt, white, centered at y=100mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_SIZES.coverTitle);
  doc.setTextColor(...COLORS.white);
  doc.text("6", PAGE_W / 2, 100, { align: "center" });

  // "CONSULT6" — 22pt white centered at y=138mm
  doc.setFontSize(FONT_SIZES.coverSub);
  doc.setTextColor(...COLORS.white);
  doc.text("CONSULT6", PAGE_W / 2, 138, { align: "center" });

  // Horizontal rule — 60mm wide, white, centered at y=146mm
  doc.setDrawColor(...COLORS.white);
  doc.setLineWidth(0.3);
  doc.line((PAGE_W - 60) / 2, 146, (PAGE_W + 60) / 2, 146);

  // Subtitle — 11pt textLight centered at y=154mm
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textLight);
  doc.text("Executive Consulting Report", PAGE_W / 2, 154, { align: "center" });

  // Org name — 18pt bold white centered at y=168mm
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text(sanitize(data.orgName || "Report"), PAGE_W / 2, 168, { align: "center" });

  // Date — 9pt textLight centered at y=177mm
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textLight);
  doc.text(sanitize(data.generatedAt), PAGE_W / 2, 177, { align: "center" });

  // Tagline — 8pt textMid centered at y=188mm
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(...COLORS.textMid);
  doc.text("Prepared by Consult6  |  Senior financial insight, no consultant required.", PAGE_W / 2, 188, { align: "center" });
}

// ─── Page: Executive Summary ─────────────────────────────────────────────────
function renderExecutiveSummary(doc: jsPDF, data: ReportData): void {
  let y = addNewPage(doc);
  y += drawSectionHeader(doc, "EXECUTIVE SUMMARY", y);
  y += 4;

  const summary = sanitize(data.analysis.summary);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.textDark);
  const lines = doc.splitTextToSize(summary, CONTENT_W) as string[];
  const lineH = FONT_SIZES.body * 0.352778 * 1.45;
  doc.text(lines, MARGIN, y + lineH);
}

// ─── Main entry point ────────────────────────────────────────────────────────
export function generatePDF(data: ReportData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  renderCover(doc, data);
  renderExecutiveSummary(doc, data);
  renderFlags(doc, data);
  renderRecommendations(doc, data);
  renderTrajectoryAndChart(doc, data);
  renderBenchmarks(doc, data);
  renderCaseStudies(doc, data);
  renderScenarios(doc, data);
  renderRiskMatrix(doc, data);
  renderActionPlan(doc, data);

  // Footer pass — all pages except cover (page 1)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, data.orgName, p - 1, totalPages - 1);
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
