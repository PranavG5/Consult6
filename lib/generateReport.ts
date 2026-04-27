import jsPDF from "jspdf";
import "jspdf-autotable";

function sanitize(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[→➜➡↗]/g, "->")
    .replace(/[↓⬇▼▽↘]/g, " (down)")
    .replace(/[↑⬆▲△]/g, " (up)")
    .replace(/[←⬅]/g, "<-")
    .replace(/[◆◇]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/!'/g, ">")
    .replace(/%¼/g, "to")
    .replace(/[^\x00-\x7E]/g, "");
}

// ─── Color palette ───────────────────────────────────────────────────────────
const ORANGE:       [number,number,number] = [249, 115,  22];  // #f97316
const BG_COVER:     [number,number,number] = [ 31,  41,  55];  // #1f2937
const BLACK:        [number,number,number] = [ 26,  26,  26];
const DARK:         [number,number,number] = [ 36,  36,  36];
const WHITE:        [number,number,number] = [240, 240, 240];
const MUTED:        [number,number,number] = [120, 120, 120];
const SLATE:        [number,number,number] = [148, 163, 184];
const SLATE_DIM:    [number,number,number] = [100, 116, 139];
const RED:          [number,number,number] = [192,  57,  43];
const AMBER:        [number,number,number] = [180, 120,   0];
const GREEN:        [number,number,number] = [ 39, 174,  96];
const BLUE_A:       [number,number,number] = [ 59, 130, 246];  // section accent bar
const CRITICAL_CLR: [number,number,number] = [234,  88,  12];  // #ea580c
const AVG_CLR:      [number,number,number] = [ 75,  85,  99];  // #4b5563
const CHART_A:      [number,number,number] = [249, 115,  22];  // Revenue — orange
const CHART_B:      [number,number,number] = [107, 114, 128];  // Expenses — gray #6b7280
const RED_LIGHT:    [number,number,number] = [ 50,  20,  20];
const AMBER_LIGHT:  [number,number,number] = [ 50,  40,  10];
const BLUE_LIGHT:   [number,number,number] = [ 15,  30,  50];
// Risk matrix — dark-theme tinted cells
const RISK_HIGH_BG: [number,number,number] = [ 60,  38,  15];  // dark orange tint
const RISK_HIGH_TXT:[number,number,number] = [249, 115,  22];  // orange
const RISK_MED_BG:  [number,number,number] = [ 55,  50,  18];  // dark amber tint
const RISK_MED_TXT: [number,number,number] = [200, 160,  50];  // amber
const RISK_LOW_BG:  [number,number,number] = [ 20,  55,  35];  // dark green tint
const RISK_LOW_TXT: [number,number,number] = [ 60, 190, 100];  // green

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface Flag { title: string; severity: "critical"|"warning"|"info"; description: string; metric?: string; }
export interface Recommendation { title: string; detail: string; priority: "high"|"medium"|"low"; }
export interface TrendSeries { name: string; values: number[]; }
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

// ─── Page helpers ─────────────────────────────────────────────────────────────
function addPageFooter(doc: jsPDF, orgName: string, pageNum: number, totalPages: number) {
  const W = doc.internal.pageSize.getWidth();
  const m = 15;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(m, 285, W - m, 285);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  const cleanOrg = sanitize(orgName || "").trim();
  const leftTxt = cleanOrg ? `${cleanOrg} - Executive Consulting Report` : "Executive Consulting Report";
  doc.text(leftTxt, m, 289);
  doc.text(`Page ${pageNum} of ${totalPages}`, W / 2, 289, { align: "center" });
  doc.text("Consult6 - Senior financial insight, no consultant required.", W - m, 289, { align: "right" });
}

function sectionHeader(doc: jsPDF, title: string, y: number, margin: number, W: number): number {
  doc.setFillColor(...BLUE_A);
  doc.rect(margin, y, 3, 10, "F");
  doc.setTextColor(...ORANGE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), margin + 7, y + 8);
  return y + 18;
}

function startSection(doc: jsPDF, W: number): number {
  doc.addPage();
  doc.setFillColor(...BG_COVER);
  doc.rect(0, 0, W, 297, "F");
  return 18;
}

function newPageInSection(doc: jsPDF, W: number): number {
  doc.addPage();
  doc.setFillColor(...BG_COVER);
  doc.rect(0, 0, W, 297, "F");
  return 18;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function generatePDF(data: ReportData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 0;

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BG_COVER);
  doc.rect(0, 0, W, 297, "F");

  // Prime text engine — prevents stray artifact on first doc.text() call
  doc.setFontSize(1);
  doc.setTextColor(...BG_COVER);
  doc.text(" ", 1, 1);

  // Large "6" focal point — orange, centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(150);
  doc.setTextColor(...ORANGE);
  doc.text("6", W / 2, 100, { align: "center" });

  // "CONSULT6" wordmark
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text("CONSULT6", W / 2, 132, { align: "center" });

  // Thin separator rule
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line((W - 60) / 2, 140, (W + 60) / 2, 140);

  // Subtitle (part of logo group)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.text("Executive Consulting Report", W / 2, 148, { align: "center" });

  // ── 30mm breathing room from CONSULT6 ──
  // Org name
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(sanitize(data.orgName || "Report"), W / 2, 180, { align: "center" });

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.text(data.generatedAt, W / 2, 189, { align: "center" });

  // Tagline
  doc.setFontSize(8);
  doc.setTextColor(...SLATE_DIM);
  doc.text("Prepared by Consult6  |  Senior financial insight, no consultant required.", W / 2, 199, { align: "center" });

  // ── PAGE 2: EXECUTIVE SUMMARY ────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(...BG_COVER);
  doc.rect(0, 0, W, 297, "F");
  y = 18;
  y = sectionHeader(doc, "Executive Summary", y, margin, W);

  const summaryLines = doc.splitTextToSize(sanitize(data.analysis.summary), W - margin * 2 - 12);
  const sumBoxH = Math.max(40, summaryLines.length * 7 + 20);
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, W - margin * 2, sumBoxH, 2, 2, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, 3, sumBoxH, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text(summaryLines, margin + 9, y + 12);

  // ── PAGE 3: WHAT WE FOUND ────────────────────────────────────────────────────
  y = startSection(doc, W);
  y = sectionHeader(doc, "What We Found", y, margin, W);
  for (const flag of data.analysis.flags) {
    const sevColors: Record<string,{bg:[number,number,number];border:[number,number,number];label:string}> = {
      critical: { bg: RED_LIGHT,   border: CRITICAL_CLR, label: "CRITICAL" },
      warning:  { bg: AMBER_LIGHT, border: AMBER, label: "WARNING"  },
      info:     { bg: BLUE_LIGHT,  border: BLUE_A, label: "INFO"    },
    };
    const sc = sevColors[flag.severity] ?? sevColors.info;
    const descLines = doc.splitTextToSize(sanitize(flag.description), W - margin * 2 - 12);
    const cardH = descLines.length * 6.5 + (flag.metric ? 12 : 0) + 24;
    if (y + cardH > 280) { y = newPageInSection(doc, W); }

    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");

    doc.setFillColor(...sc.border);
    doc.roundedRect(margin + 3, y + 5, 28, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(sc.label, margin + 5, y + 10.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text(sanitize(flag.title), margin + 34, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 200, 200);
    doc.text(descLines, margin + 8, y + 22);

    if (flag.metric) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...sc.border as [number,number,number]);
      doc.text(`Metric: ${sanitize(flag.metric)}`, margin + 8, y + cardH - 5);
    }
    y += cardH + 5;
  }

  // ── PAGE 4: WHAT WE'D DO ─────────────────────────────────────────────────────
  y = startSection(doc, W);
  y = sectionHeader(doc, "What We'd Do", y, margin, W);
  for (let i = 0; i < data.analysis.recommendations.length; i++) {
    const rec = data.analysis.recommendations[i];
    const detailLines = doc.splitTextToSize(sanitize(rec.detail), W - margin * 2 - 12);
    const cardH = detailLines.length * 6.5 + 24;
    if (y + cardH > 272) { y = newPageInSection(doc, W); }

    doc.setFillColor(...DARK);
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");

    doc.setFillColor(...ORANGE);
    doc.circle(margin + 9, y + 11, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(`${i + 1}`, margin + 9, y + 14, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text(sanitize(rec.title), margin + 20, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 200, 200);
    doc.text(detailLines, margin + 8, y + 23);
    y += cardH + 5;
  }

  // ── TRAJECTORY — share page with chart if short, else own page ───────────────
  const trajWordCount = (data.analysis.trajectoryNote || "").split(/\s+/).filter(Boolean).length;
  const trajLines = doc.splitTextToSize(sanitize(data.analysis.trajectoryNote), W - margin * 2 - 12);
  const trajH = Math.max(32, trajLines.length * 8 + 18);

  // Chart height estimate for share-page decision
  const chartH = 80;
  const chartTotalH = 16 + chartH + 28; // sectionHeader + chart + legend
  const combinedFits = trajH + 16 + 16 + chartTotalH + 20 <= 297 - 15 - 15;
  const shouldCombine = trajWordCount < 120 && combinedFits && data.mode === "advanced" && !!data.analysis.trendData;

  y = startSection(doc, W);
  y = sectionHeader(doc, "Where This Is Heading", y, margin, W);
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, W - margin * 2, trajH, 3, 3, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, 3, trajH, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.setTextColor(200, 200, 200);
  doc.text(trajLines, margin + 10, y + 13);
  y += trajH + 10;

  // ── FINANCIAL TREND ──────────────────────────────────────────────────────────
  if (data.mode === "advanced" && data.analysis.trendData) {
    if (!shouldCombine) {
      y = startSection(doc, W);
    }
    y = sectionHeader(doc, "Financial Trend", y, margin, W);

    const td = data.analysis.trendData;
    const parseNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      const s = String(v).replace(/[$,%]/g, "").replace(/,/g, "");
      return parseFloat(s);
    };

    const allVals = td.series.flatMap(s => (Array.isArray(s.values) ? s.values : []).map(parseNum)).filter(isFinite);

    if (!allVals.length) {
      // Placeholder
      doc.setFillColor(...DARK);
      doc.roundedRect(margin, y, W - margin * 2, 40, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text("Chart data unavailable", W / 2, y + 22, { align: "center" });
    } else {
      const maxVal = Math.max(...allVals);
      const maxRounded = Math.ceil(maxVal / 10000) * 10000 || 1;
      const n = td.labels.length;
      const seriesColors: [number,number,number][] = [CHART_A, CHART_B, ORANGE];

      // Chart area
      const yAxisLabelW = 14;
      const axisX = margin + yAxisLabelW;
      const axisY = y;
      const axisW = W - axisX - margin;
      const axisH = chartH;

      // Chart background
      doc.setFillColor(...DARK);
      doc.roundedRect(margin, y - 2, W - margin * 2, axisH + 28, 2, 2, "F");

      // Y-axis line
      doc.setDrawColor(70, 70, 70);
      doc.setLineWidth(0.3);
      doc.line(axisX, axisY, axisX, axisY + axisH);
      // X-axis line
      doc.line(axisX, axisY + axisH, axisX + axisW, axisY + axisH);

      // Y-axis ticks + grid lines + labels
      const numTicks = 5;
      for (let t = 0; t <= numTicks; t++) {
        const tickVal = (maxRounded / numTicks) * t;
        const tickY = axisY + axisH - (tickVal / maxRounded) * axisH;
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.1);
        doc.line(axisX, tickY, axisX + axisW, tickY);
        const labelStr = tickVal >= 1000 ? `${Math.round(tickVal / 1000)}k` : `${Math.round(tickVal)}`;
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text(labelStr, axisX - 2, tickY + 1, { align: "right" });
      }

      // Grouped bars
      if (n > 0) {
        const groupW = axisW / n;
        const numSeries = td.series.length;
        const totalBarW = groupW * 0.7;
        const barGap = numSeries > 1 ? 2 : 0;
        const singleBarW = Math.max(2, (totalBarW - barGap * (numSeries - 1)) / numSeries);

        td.series.forEach((series, si) => {
          const vals = (Array.isArray(series.values) ? series.values : []).map(parseNum);
          const col = seriesColors[si % seriesColors.length];
          doc.setFillColor(...col);
          vals.forEach((v, j) => {
            if (!isFinite(v) || v <= 0) return;
            const barH = (v / maxRounded) * axisH;
            const gLeft = axisX + j * groupW + (groupW - totalBarW) / 2;
            const bx = gLeft + si * (singleBarW + barGap);
            const by = axisY + axisH - barH;
            doc.rect(bx, by, singleBarW, barH, "F");
          });
        });
      }

      // X-axis labels
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      td.labels.forEach((label, i) => {
        const lx = axisX + (i + 0.5) * (axisW / Math.max(n, 1));
        doc.text(sanitize(label), lx, axisY + axisH + 6, { align: "center" });
      });

      // Legend — centered below chart
      const legendY = axisY + axisH + 16;
      const legendItemW = 65;
      const legendStartX = (W - td.series.length * legendItemW) / 2;
      td.series.forEach((series, si) => {
        const col = seriesColors[si % seriesColors.length];
        const lx = legendStartX + si * legendItemW;
        doc.setFillColor(...col);
        doc.rect(lx, legendY - 3, 4, 4, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text(sanitize(series.name), lx + 7, legendY);
      });

      y += axisH + 28;
    }
  }

  // ── HOW YOU COMPARE ───────────────────────────────────────────────────────────
  if (data.mode === "advanced" && data.analysis.industryComparisons?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "How You Compare", y, margin, W);

    (doc as any).autoTable({
      startY: y,
      head: [["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"]],
      body: data.analysis.industryComparisons.map(c => [
        sanitize(c.metric), sanitize(c.yourValue), sanitize(c.industryAverage), sanitize(c.topQuartile),
        c.status === "above_average" ? "Above Avg" : c.status === "below_average" ? "Below Avg" : "Average",
      ]),
      theme: "plain",
      headStyles: { fillColor: [36,36,36], textColor: [204,85,0], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fillColor: [26,26,26], textColor: [200,200,200], fontSize: 8, lineWidth: 0.2, lineColor: [50,50,50], minCellHeight: 12 },
      alternateRowStyles: { fillColor: [30,30,30] },
      styles: { lineWidth: 0.2, lineColor: [50,50,50], cellPadding: 3, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 70, halign: "left"   as const },
        1: { cellWidth: 28, halign: "center" as const },
        2: { cellWidth: 28, halign: "center" as const },
        3: { cellWidth: 28, halign: "center" as const },
        4: { cellWidth: 26, halign: "center" as const },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 4) {
          const val: string = hookData.cell.raw?.toString() ?? "";
          hookData.cell.styles.fontStyle = "bold";
          if (val === "Above Avg") hookData.cell.styles.textColor = [39,174,96];
          else if (val === "Below Avg") hookData.cell.styles.textColor = CRITICAL_CLR;
          else hookData.cell.styles.textColor = AVG_CLR;
        }
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── WHO'S BEEN HERE BEFORE (only if caseStudies exist) ───────────────────────
  if (data.mode === "advanced" && data.analysis.caseStudies?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "Who's Been Here Before", y, margin, W);

    for (const cs of data.analysis.caseStudies) {
      if (y + 60 > 280) { y = newPageInSection(doc, W); }

      // Org name header bar
      doc.setFillColor(...DARK);
      doc.roundedRect(margin, y, W - margin * 2, 13, 2, 2, "F");
      doc.setFillColor(...ORANGE);
      doc.rect(margin, y, 3, 13, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ORANGE);
      doc.text(sanitize(cs.organization), margin + 8, y + 9);
      y += 13;

      // Three-column table — each col 60mm (total 180mm = full content width)
      (doc as any).autoTable({
        startY: y,
        head: [["Challenge", "Solution", "Outcome"]],
        body: [[sanitize(cs.challenge), sanitize(cs.solution), sanitize(cs.outcome)]],
        theme: "plain",
        headStyles: { fillColor: [45,45,45], textColor: [150,150,150], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fillColor: [36,36,36], textColor: [200,200,200], fontSize: 9.5, lineWidth: 0.2, lineColor: [60,60,60], cellPadding: 4 },
        styles: { overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 60, halign: "left" as const },
          1: { cellWidth: 60, halign: "left" as const },
          2: { cellWidth: 60, halign: "left" as const },
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY;

      if (cs.source) {
        doc.setFillColor(30, 30, 30);
        doc.rect(margin, y, W - margin * 2, 9, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(110, 110, 110);
        doc.text(`Source: ${sanitize(cs.source)}`, margin + 6, y + 5.5);
        y += 9;
      }
      y += 8;
    }
  }

  // ── HOW THIS COULD PLAY OUT ───────────────────────────────────────────────────
  if (data.mode === "advanced" && data.analysis.scenarios) {
    const scens = [
      { label: "OPTIMISTIC", text: data.analysis.scenarios.optimistic, color: GREEN  as [number,number,number] },
      { label: "BASE CASE",  text: data.analysis.scenarios.base,        color: BLUE_A as [number,number,number] },
      { label: "PESSIMISTIC",text: data.analysis.scenarios.pessimistic, color: RED    as [number,number,number] },
    ];
    const cw = (W - margin * 2 - 8) / 3;
    const hPad = 6;
    const scenData = scens.map(s => {
      const wrapped = doc.splitTextToSize(sanitize(s.text), cw - hPad * 2);
      return { ...s, wrapped, cardH: Math.max(60, wrapped.length * 6.5 + 26) };
    });
    const maxScenH = Math.max(...scenData.map(s => s.cardH));

    y = startSection(doc, W);
    y = sectionHeader(doc, "How This Could Play Out", y, margin, W);

    scenData.forEach((s, i) => {
      const sx = margin + i * (cw + 4);
      doc.setFillColor(...DARK);
      doc.roundedRect(sx, y, cw, maxScenH, 2, 2, "F");
      doc.setFillColor(...s.color);
      doc.rect(sx, y, cw, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...s.color);
      doc.text(s.label, sx + hPad, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...WHITE);
      doc.text(s.wrapped, sx + hPad, y + 22);
    });
    y += maxScenH + 6;
  }

  // ── WHAT WE'RE WATCHING ───────────────────────────────────────────────────────
  if (data.mode === "advanced" && data.analysis.riskMatrix?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "What We're Watching", y, margin, W);

    (doc as any).autoTable({
      startY: y,
      head: [["Risk", "Likelihood", "Impact", "Mitigation"]],
      body: data.analysis.riskMatrix.map(r => [
        sanitize(r.risk), r.likelihood.toUpperCase(), r.impact.toUpperCase(), sanitize(r.mitigation),
      ]),
      theme: "plain",
      headStyles: { fillColor: [36,36,36], textColor: [204,85,0], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fillColor: [26,26,26], textColor: [200,200,200], fontSize: 8.5, lineWidth: 0.2, lineColor: [50,50,50], minCellHeight: 14 },
      alternateRowStyles: { fillColor: [30,30,30] },
      styles: { lineWidth: 0.2, lineColor: [50,50,50], cellPadding: 3, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 55, halign: "left"   as const },
        1: { cellWidth: 25, halign: "center" as const },
        2: { cellWidth: 25, halign: "center" as const },
        3: { cellWidth: 75, halign: "left"   as const },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && (hookData.column.index === 1 || hookData.column.index === 2)) {
          const val = hookData.cell.raw?.toString().toLowerCase();
          if (val === "high") {
            hookData.cell.styles.fillColor = RISK_HIGH_BG;
            hookData.cell.styles.textColor = RISK_HIGH_TXT;
            hookData.cell.styles.fontStyle = "bold";
          } else if (val === "medium") {
            hookData.cell.styles.fillColor = RISK_MED_BG;
            hookData.cell.styles.textColor = RISK_MED_TXT;
            hookData.cell.styles.fontStyle = "bold";
          } else if (val === "low") {
            hookData.cell.styles.fillColor = RISK_LOW_BG;
            hookData.cell.styles.textColor = RISK_LOW_TXT;
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── YOUR NEXT STEPS ───────────────────────────────────────────────────────────
  if (data.mode === "advanced" && data.analysis.actionPlan) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "Your Next Steps", y, margin, W);

    const phases = [
      { label: "IMMEDIATE (0-30 days)",   items: data.analysis.actionPlan.immediate,  color: RED   as [number,number,number] },
      { label: "SHORT-TERM (30-90 days)", items: data.analysis.actionPlan.shortTerm,  color: AMBER as [number,number,number] },
      { label: "LONG-TERM (90+ days)",    items: data.analysis.actionPlan.longTerm,   color: GREEN as [number,number,number] },
    ];
    const bulletX = margin + 8;
    for (const phase of phases) {
      if (y > 265) { y = newPageInSection(doc, W); }
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(26, 86, 164);
      doc.text(phase.label, margin, y + 5);
      y += 13;
      for (const item of phase.items) {
        const wrapped = doc.splitTextToSize(`- ${sanitize(item)}`, W - bulletX - margin);
        const cardH = wrapped.length * 6.5 + 12;
        if (y + cardH > 280) { y = newPageInSection(doc, W); }
        doc.setFillColor(...DARK);
        doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "F");
        doc.setFillColor(...phase.color);
        doc.rect(margin, y, 3, cardH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...WHITE);
        doc.text(wrapped, bulletX, y + 8);
        y += cardH + 4;
      }
      y += 5;
    }
  }

  // ── HEADERS & FOOTERS (all pages except cover) ────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) {
      addPageFooter(doc, data.orgName, p - 1, totalPages - 1);
    }
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
