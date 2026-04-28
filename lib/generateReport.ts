// Type definitions shared across the app and PDF renderer.
// All drawing code lives in pdfGenerator.ts.

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

export interface Flag {
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  metric?: string;
}

export interface Recommendation {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface TrendSeries {
  name: string;
  values: (number | string)[];
}

export interface TrendData {
  label: string;
  series: TrendSeries[];
  labels: string[];
}

export interface IndustryComparison {
  metric: string;
  yourValue: string;
  industryAverage: string;
  topQuartile: string;
  status: string;
}

export interface CaseStudy {
  organization: string;
  challenge: string;
  solution: string;
  outcome: string;
  source?: string;
}

export interface Scenarios {
  optimistic: string;
  base: string;
  pessimistic: string;
}

export interface RiskMatrixItem {
  risk: string;
  likelihood: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  mitigation: string;
}

export interface ActionPlan {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

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

// Stub — full implementation will be wired in once pdfGenerator.ts is complete.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generatePDF(_data: ReportData): Uint8Array {
  return new Uint8Array();
}
