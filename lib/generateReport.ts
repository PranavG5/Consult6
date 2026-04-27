import jsPDF from "jspdf";
import "jspdf-autotable";

function formatFinancialValue(v: string): string {
  // If already contains a $ or % or looks formatted, return as-is
  if (/[$%]/.test(v) || /[,]/.test(v)) return v;
  const num = parseFloat(v.replace(/[^0-9.\-]/g, ""));
  if (isNaN(num)) return v;
  // Integer-like: format with commas
  if (Number.isInteger(num)) {
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString("en-US");
    return num < 0 ? `($${formatted})` : `$${formatted}`;
  }
  // Looks like a ratio/percentage (small number)
  if (Math.abs(num) < 200) return `${num.toFixed(1)}%`;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString("en-US");
  return num < 0 ? `($${formatted})` : `$${formatted}`;
}

function sanitize(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[→➜➡]/g, "->")
    .replace(/[↓⬇▼▽]/g, "(down)")
    .replace(/[↑⬆▲△]/g, "(up)")
    .replace(/[←⬅]/g, "<-")
    .replace(/[◆◇•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x00-\x7E]/g, "");
}

const ORANGE: [number, number, number] = [204, 85, 0];
const BLACK: [number, number, number] = [26, 26, 26];
const DARK: [number, number, number] = [36, 36, 36];
const WHITE: [number, number, number] = [240, 240, 240];
const MUTED: [number, number, number] = [120, 120, 120];
const RED: [number, number, number] = [192, 57, 43];
const AMBER: [number, number, number] = [180, 120, 0];
const BLUE: [number, number, number] = [41, 128, 185];
const RED_LIGHT: [number, number, number] = [50, 20, 20];
const AMBER_LIGHT: [number, number, number] = [50, 40, 10];
const BLUE_LIGHT: [number, number, number] = [15, 30, 50];

export interface Flag { title: string; severity: "critical" | "warning" | "info"; description: string; metric?: string; }
export interface Recommendation { title: string; detail: string; priority: "high" | "medium" | "low"; }
export interface TrendSeries { name: string; values: number[]; }
export interface TrendData { label: string; series: TrendSeries[]; labels: string[]; }
export interface IndustryComparison { metric: string; yourValue: string; industryAverage: string; topQuartile: string; status: string; }
export interface CaseStudy { organization: string; challenge: string; solution: string; outcome: string; source?: string; }
export interface Scenarios { optimistic: string; base: string; pessimistic: string; }
export interface RiskMatrixItem { risk: string; likelihood: "high" | "medium" | "low"; impact: "high" | "medium" | "low"; mitigation: string; }
export interface ActionPlan { immediate: string[]; shortTerm: string[]; longTerm: string[]; }

export interface AnalysisResult {
  summary: string;
  flags: Flag[];
  recommendations: Recommendation[];
  trajectoryNote: string;
  trendData?: TrendData;
  industryComparisons?: IndustryComparison[];
  caseStudies?: CaseStudy[];
  scenarios?: Scenarios;
  riskMatrix?: RiskMatrixItem[];
  actionPlan?: ActionPlan;
}

export interface ReportData {
  orgName: string;
  fileName: string;
  generatedAt: string;
  mode: string;
  analysis: AnalysisResult;
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BLACK);
  doc.rect(0, H - 10, W, 10, "F");
  doc.setTextColor(...MUTED);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Consult6 - Senior financial insight, no consultant required.", 14, H - 3.5);
  doc.text(`Page ${pageNum} of ${totalPages}`, W - 14, H - 3.5, { align: "right" });
}

function addPageHeader(doc: jsPDF, orgName: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 10, "F");
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const cleanOrg = sanitize(orgName || "").trim();
  const headerText = cleanOrg
    ? `${cleanOrg} - Executive Consulting Report`
    : "Executive Consulting Report";
  doc.text(headerText, W / 2, 6.5, { align: "center" });
}

function sectionHeader(doc: jsPDF, title: string, y: number, margin: number, W: number): number {
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, W - margin * 2, 0.5, "F");
  doc.setTextColor(...ORANGE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), margin, y - 2);
  return y + 7;
}

function startSection(doc: jsPDF, W: number): number {
  doc.addPage();
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 297, "F");
  return 20;
}

export function generatePDF(data: ReportData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  // Cover page — centered design
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 297, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, W, 2, "F");

  // Logo mark (centered)
  const logoSize = 32;
  const logoX = (W - logoSize) / 2;
  const logoY = 66;
  doc.setFillColor(...ORANGE);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 5, 5, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const sixW = doc.getTextWidth("6");
  doc.text("6", W / 2 - sixW / 2, logoY + 21);

  // Wordmark
  doc.setTextColor(...ORANGE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CONSULT6", W / 2, logoY + 40, { align: "center" });

  // Report title
  doc.setTextColor(...WHITE);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Consulting Report", W / 2, 132, { align: "center" });

  // Organization name
  doc.setFontSize(15);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(data.orgName || "Report", W / 2, 150, { align: "center" });

  // Date
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(data.generatedAt, W / 2, 163, { align: "center" });

  // Divider
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 28, 173, W / 2 + 28, 173);

  // Prepared by line
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Prepared by Consult6", W / 2, 248, { align: "center" });

  // Tagline
  doc.setFontSize(7.5);
  doc.setTextColor(65, 65, 65);
  doc.setFont("helvetica", "italic");
  doc.text("Senior financial insight, no consultant required.", W / 2, 260, { align: "center" });

  // Page 2: Analysis
  doc.addPage();
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 297, "F");
  y = 20;

  // Executive Summary
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, W - margin * 2, 50, 3, 3, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, 3, 50, "F");
  doc.setTextColor(...ORANGE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", margin + 8, y + 8);
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(sanitize(data.analysis.summary), W - margin * 2 - 16);
  doc.text(summaryLines, margin + 8, y + 16);
  y += 58;

  // What We Found — own page
  y = startSection(doc, W);
  y = sectionHeader(doc, "What We Found", y, margin, W);
  for (const flag of data.analysis.flags) {
    if (y > 260) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, 297, "F"); y = 20; }
    const sevColors: Record<string, { bg: [number,number,number]; border: [number,number,number]; label: string }> = {
      critical: { bg: RED_LIGHT, border: RED, label: "CRITICAL" },
      warning: { bg: AMBER_LIGHT, border: AMBER, label: "WARNING" },
      info: { bg: BLUE_LIGHT, border: BLUE, label: "INFO" },
    };
    const sc = sevColors[flag.severity] ?? sevColors.info;
    const descLines = doc.splitTextToSize(sanitize(flag.description), W - margin * 2 - 12);
    const cardH = descLines.length * 6.5 + (flag.metric ? 10 : 0) + 22;

    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");

    doc.setFillColor(...sc.border);
    doc.roundedRect(margin + 3, y + 5, 26, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(sc.label, margin + 5, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text(sanitize(flag.title), margin + 32, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text(descLines, margin + 6, y + 22);

    if (flag.metric) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...sc.border as [number,number,number]);
      doc.text(`Metric: ${sanitize(flag.metric)}`, margin + 6, y + cardH - 5);
    }
    y += cardH + 5;
  }

  y = startSection(doc, W);
  y = sectionHeader(doc, "What We'd Do", y, margin, W);

  for (let i = 0; i < data.analysis.recommendations.length; i++) {
    const rec = data.analysis.recommendations[i];
    if (y > 260) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, 297, "F"); y = 20; }
    const detailLines = doc.splitTextToSize(sanitize(rec.detail), W - margin * 2 - 12);
    const cardH = detailLines.length * 6.5 + 22;

    doc.setFillColor(...DARK);
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");

    doc.setFillColor(...ORANGE);
    doc.circle(margin + 8, y + 10, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(`${i + 1}`, margin + 8, y + 13, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text(sanitize(rec.title), margin + 18, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.text(detailLines, margin + 6, y + 22);
    y += cardH + 5;
  }

  // Trajectory — own page
  y = startSection(doc, W);
  y = sectionHeader(doc, "Where This Is Heading", y, margin, W);
  const trajLines = doc.splitTextToSize(sanitize(data.analysis.trajectoryNote), W - margin * 2 - 12);
  const trajH = Math.max(30, trajLines.length * 8 + 16);
  doc.setFillColor(...DARK);
  doc.roundedRect(margin, y, W - margin * 2, trajH, 3, 3, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(margin, y, 3, trajH, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(13);
  doc.setTextColor(200, 200, 200);
  doc.text(trajLines, margin + 10, y + 12);
  y += trajH + 8;

  // Advanced sections
  if (data.mode === "advanced" && data.analysis.trendData) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "Financial Trend", y, margin, W);

    const td = data.analysis.trendData;
    const chartW = W - margin * 2;
    const chartH = 100;

    const parseNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      const s = String(v).replace(/[$,%]/g, "").replace(/,/g, "");
      return parseFloat(s);
    };

    const allVals = td.series.flatMap(s => (Array.isArray(s.values) ? s.values : []).map(parseNum)).filter(isFinite);
    const maxVal = allVals.length ? Math.max(...allVals) : 1;
    const minVal = allVals.length ? Math.min(...allVals) : 0;
    const range = maxVal - minVal || 1;
    const colors: [number,number,number][] = [ORANGE, [41, 128, 185], [39, 174, 96]];

    doc.setFillColor(...DARK);
    doc.roundedRect(margin, y, chartW, chartH + 26, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(sanitize(td.label), margin + 6, y + 8);

    const plotX = margin + 6;
    const plotY = y + 14;
    const plotW = chartW - 12;
    const plotH = chartH;
    const n = td.labels.length;

    // Grid lines
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.1);
    for (let g = 0; g <= 4; g++) {
      const gy = plotY + (g / 4) * plotH;
      doc.line(plotX, gy, plotX + plotW, gy);
    }

    // Series lines
    td.series.forEach((series, si) => {
      const vals = (Array.isArray(series.values) ? series.values : []).map(parseNum).filter(isFinite);
      if (vals.length < 2) return;
      const nPts = vals.length;
      const col = colors[si % colors.length];
      doc.setDrawColor(...col);
      doc.setFillColor(...col);
      doc.setLineWidth(1.2);
      for (let i = 0; i < nPts - 1; i++) {
        const x1 = plotX + (i / (nPts - 1)) * plotW;
        const y1 = plotY + plotH - ((vals[i] - minVal) / range) * plotH;
        const x2 = plotX + ((i + 1) / (nPts - 1)) * plotW;
        const y2 = plotY + plotH - ((vals[i + 1] - minVal) / range) * plotH;
        doc.line(x1, y1, x2, y2);
        doc.circle(x1, y1, 1.4, "F");
        if (i === nPts - 2) doc.circle(x2, y2, 1.4, "F");
      }
    });

    // Labels
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    td.labels.forEach((label, i) => {
      const lx = plotX + (i / Math.max(n - 1, 1)) * plotW;
      doc.text(label, lx, plotY + plotH + 7, { align: "center" });
    });

    // Legend
    td.series.forEach((series, si) => {
      const col = colors[si % colors.length];
      const lx = plotX + si * 70;
      doc.setFillColor(...col);
      doc.rect(lx, plotY + plotH + 14, 8, 2.5, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(9);
      doc.text(sanitize(series.name), lx + 11, plotY + plotH + 16);
    });

    y += chartH + 30;
  }

  if (data.mode === "advanced" && data.analysis.industryComparisons?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "How You Compare", y, margin, W);

    (doc as any).autoTable({
      startY: y,
      head: [["Metric", "Your Value", "Industry Avg", "Top 25%", "Status"]],
      body: data.analysis.industryComparisons.map(c => {
        const trim = (v: string) => v.length > 30 ? v.slice(0, 28) + ".." : v;
        return [
          c.metric, trim(c.yourValue), trim(c.industryAverage), trim(c.topQuartile),
          c.status === "above_average" ? "Above Avg" : c.status === "below_average" ? "Below Avg" : "Average",
        ];
      }),
      theme: "plain",
      headStyles: { fillColor: [36, 36, 36], textColor: [204, 85, 0], fontStyle: "bold", fontSize: 11 },
      bodyStyles: { fillColor: [26, 26, 26], textColor: [200, 200, 200], fontSize: 11, lineWidth: 0.2, lineColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [30, 30, 30] },
      styles: { lineWidth: 0.2, lineColor: [50, 50, 50], cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 62, halign: "left" as const },
        1: { cellWidth: 34, halign: "center" as const },
        2: { cellWidth: 34, halign: "center" as const },
        3: { cellWidth: 28, halign: "center" as const },
        4: { cellWidth: 24, halign: "center" as const },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 4) {
          const val: string = hookData.cell.text?.[0] ?? "";
          hookData.cell.styles.fontStyle = "bold";
          if (val === "Above Avg") hookData.cell.styles.textColor = [39, 174, 96];
          else if (val === "Below Avg") hookData.cell.styles.textColor = [192, 57, 43];
          else hookData.cell.styles.textColor = [180, 130, 0];
        }
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.mode === "advanced" && data.analysis.caseStudies?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "Who's Been Here Before", y, margin, W);

    for (const cs of data.analysis.caseStudies) {
      if (y > 250) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, 297, "F"); y = 20; }
      const cols = (W - margin * 2 - 10) / 3;
      const texts = [cs.challenge, cs.solution, cs.outcome];
      const wrappedTexts = texts.map(t => doc.splitTextToSize(sanitize(t), cols - 6));
      const maxLines = Math.max(...wrappedTexts.map(w => w.length));
      const cardH = Math.max(50, maxLines * 6.5 + 28) + (cs.source ? 10 : 0);

      doc.setFillColor(...DARK);
      doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "F");
      doc.setFillColor(...ORANGE);
      doc.rect(margin, y, 3, cardH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...ORANGE);
      doc.text(sanitize(cs.organization), margin + 8, y + 9);

      const labels = ["Challenge", "Solution", "Outcome"];
      labels.forEach((label, i) => {
        const cx = margin + 8 + i * cols;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(label.toUpperCase(), cx, y + 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text(wrappedTexts[i], cx, y + 26);
      });

      if (cs.source) {
        const srcY = y + cardH - 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102);
        doc.text("Source:", margin + 6, srcY);
        const labelW = doc.getTextWidth("Source: ");
        doc.setFont("helvetica", "italic");
        doc.text(sanitize(cs.source), margin + 6 + labelW, srcY);
      }

      y += cardH + 6;
    }
  }

  if (data.mode === "advanced" && data.analysis.scenarios) {
    const scens = [
      { label: "OPTIMISTIC", text: data.analysis.scenarios.optimistic, color: [39, 174, 96] as [number,number,number] },
      { label: "BASE CASE", text: data.analysis.scenarios.base, color: BLUE },
      { label: "PESSIMISTIC", text: data.analysis.scenarios.pessimistic, color: RED },
    ];
    const cw = (W - margin * 2 - 8) / 3;
    const hPad = 6;
    const scenData = scens.map(s => {
      const wrapped = doc.splitTextToSize(sanitize(s.text), cw - hPad * 2);
      return { ...s, wrapped, cardH: Math.max(60, wrapped.length * 6.5 + 24) };
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
      doc.text(s.label, sx + hPad, y + 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text(s.wrapped, sx + hPad, y + 20);
    });
    y += maxScenH + 6;
  }

  if (data.mode === "advanced" && data.analysis.riskMatrix?.length) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "What We're Watching", y, margin, W);

    const riskColors: Record<string, [number,number,number]> = { high: RED, medium: AMBER, low: [39, 174, 96] };
    (doc as any).autoTable({
      startY: y,
      head: [["Risk", "Likelihood", "Impact", "Mitigation"]],
      body: data.analysis.riskMatrix.map(r => [sanitize(r.risk), r.likelihood.toUpperCase(), r.impact.toUpperCase(), sanitize(r.mitigation)]),
      theme: "plain",
      headStyles: { fillColor: [36, 36, 36], textColor: [204, 85, 0], fontStyle: "bold", fontSize: 11 },
      bodyStyles: { fillColor: [26, 26, 26], textColor: [200, 200, 200], fontSize: 11, lineWidth: 0.2, lineColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [30, 30, 30] },
      styles: { cellPadding: 4 },
      columnStyles: {
        1: { halign: "center" as const, cellWidth: 30 },
        2: { halign: "center" as const, cellWidth: 26 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && (hookData.column.index === 1 || hookData.column.index === 2)) {
          const val = hookData.cell.raw?.toString().toLowerCase();
          const col = riskColors[val] ?? MUTED;
          hookData.cell.styles.textColor = col;
          hookData.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.mode === "advanced" && data.analysis.actionPlan) {
    y = startSection(doc, W);
    y = sectionHeader(doc, "Your Next Steps", y, margin, W);

    const phases = [
      { label: "IMMEDIATE (0–30 days)", items: data.analysis.actionPlan.immediate, color: RED },
      { label: "SHORT-TERM (30–90 days)", items: data.analysis.actionPlan.shortTerm, color: AMBER },
      { label: "LONG-TERM (90+ days)", items: data.analysis.actionPlan.longTerm, color: [39, 174, 96] as [number,number,number] },
    ];

    const bulletIndent = margin + 7; // ~20pt
    for (const phase of phases) {
      if (y > 260) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, 297, "F"); y = 20; }
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(26, 86, 164);
      doc.text(phase.label, margin, y + 5);
      y += 12;
      for (const item of phase.items) {
        if (y > 265) { doc.addPage(); doc.setFillColor(...BLACK); doc.rect(0, 0, W, 297, "F"); y = 20; }
        const wrapped = doc.splitTextToSize(`- ${sanitize(item)}`, W - bulletIndent - margin);
        const lineH = 6.5;
        const cardH = wrapped.length * lineH + 10;
        doc.setFillColor(...DARK);
        doc.roundedRect(margin, y, W - margin * 2, cardH, 1.5, 1.5, "F");
        doc.setFillColor(26, 86, 164);
        doc.rect(margin, y, 2, cardH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...WHITE);
        doc.text(wrapped, bulletIndent, y + 7);
        y += cardH + 3;
      }
      y += 4;
    }
  }

  // Add headers and footers to all pages except the cover
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) {
      addPageHeader(doc, data.orgName);
      addPageFooter(doc, p - 1, totalPages - 1);
    }
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
