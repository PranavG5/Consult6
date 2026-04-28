// Type definitions shared across the app and PDF renderer.
// All drawing code lives in pdfGenerator.ts.

export function sanitize(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[→➜➡↗]/g, " to ")
    .replace(/[↓⬇▼▽↘]/g, " to ")
    .replace(/[↑⬆▲△]/g, " to ")
    .replace(/[←⬅]/g, "<-")
    .replace(/[◆◇•·]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/!'/g, " to ")
    .replace(/%¼/g, " to ")
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

import { generateAndValidate } from "./pdfGenerator";

export function generatePDF(data: ReportData): Uint8Array {
  return generateAndValidate(data.analysis, data.orgName, data.generatedAt);
}
