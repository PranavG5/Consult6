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

// ─── Stub: main entry point — page rendering not yet implemented ─────────────
export function generatePDF(data: ReportData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Cover (placeholder)
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  void data;
  return doc.output("arraybuffer") as unknown as Uint8Array;
}
