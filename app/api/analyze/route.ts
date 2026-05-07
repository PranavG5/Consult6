import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";
import { deduplicateCSV } from "@/lib/deduplicateCSV";
import Papa from "papaparse";

export const maxDuration = 120;

const anthropic = new Anthropic();

const LIMITS = {
  free: { basic: 3, advanced: 1 },
  paid: { basic: 10, advanced: 3 },
  enterprise: { basic: 50, advanced: 20 },
  admin: { basic: 999999, advanced: 999999 },
};

function summarize(rawText: string, mode: string = "basic"): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";

  const headerLine = lines[0];
  const dataLines = lines.slice(1);
  const rowCount = dataLines.length;
  const colCount = headerLine.split(",").length;

  const firstN = mode === "advanced" ? 30 : 15;
  const lastN = mode === "advanced" ? 10 : 5;

  const firstRows = dataLines.slice(0, firstN);
  const lastRows = rowCount > firstN + lastN ? dataLines.slice(-lastN) : [];

  const parts = [
    `Total rows: ${rowCount} | Total columns: ${colCount}`,
    `Headers: ${headerLine}`,
    `First ${firstRows.length} rows:\n${firstRows.join("\n")}`,
  ];

  if (lastRows.length) {
    parts.push(`Last ${lastRows.length} rows:\n${lastRows.join("\n")}`);
  }

  return parts.join("\n\n");
}

type ColStats = { first: number | string; last: number | string; min?: number; max?: number; avg?: number };
interface AggregatedStats {
  row_count: number;
  date_range: { first: string | null; last: string | null };
  columns: Record<string, ColStats>;
  cash_runway_months?: number | null;
}

function aggregateCSV(rawText: string): AggregatedStats {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { row_count: 0, date_range: { first: null, last: null }, columns: {} };

  const parseRow = (line: string) => line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const headers = parseRow(lines[0]);
  const dataRows = lines.slice(1).map(parseRow);

  const isDateLike = (v: string) =>
    /^\d{4}-\d{2}-\d{2}/.test(v) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v) ||
    /^\d{4}Q[1-4]/i.test(v) ||
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(v);

  const toNum = (v: string) => Number(v.replace(/[,$% ]/g, ""));

  let dateColIdx = -1;
  for (let c = 0; c < headers.length; c++) {
    const sample = dataRows.find(r => r[c] !== "")?.[c] ?? "";
    if (isDateLike(sample)) { dateColIdx = c; break; }
  }

  const columns: Record<string, ColStats> = {};
  for (let c = 0; c < headers.length; c++) {
    if (c === dateColIdx) continue;
    const name = headers[c];
    if (!name) continue;
    const vals = dataRows.map(r => r[c] ?? "").filter(v => v !== "");
    if (!vals.length) continue;

    const numVals = vals.map(toNum).filter(n => !isNaN(n) && isFinite(n));
    if (numVals.length > vals.length / 2) {
      const sum = numVals.reduce((a, b) => a + b, 0);
      columns[name] = {
        first: numVals[0],
        last: numVals[numVals.length - 1],
        min: Math.min(...numVals),
        max: Math.max(...numVals),
        avg: Math.round((sum / numVals.length) * 100) / 100,
      };
    } else {
      columns[name] = { first: vals[0], last: vals[vals.length - 1] };
    }
  }

  return {
    row_count: dataRows.length,
    date_range: {
      first: dateColIdx >= 0 ? (dataRows[0]?.[dateColIdx] ?? null) : null,
      last: dateColIdx >= 0 ? (dataRows[dataRows.length - 1]?.[dateColIdx] ?? null) : null,
    },
    columns,
  };
}

const SYSTEM_BASIC = `You are a senior financial analyst. Analyze only what the data actually shows. Do not mention any metric that is null, unavailable, or not present in the data. Tailor everything to the specific organization, size, and industry provided.

Return ONLY valid JSON with this exact structure. No explanation, no markdown, no code fences.

{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}

Rules:
- 2-4 flags. Only flag metrics that have real data values. Each description under 30 words. Metric must be a specific number or ratio from the data.
- 2-3 recommendations that are realistic and specific to this organization. Under 30 words each.
- Summary: 1-2 sentences, specific to this org. No generic statements.
- trajectoryNote: 1 sentence on where this org is headed based on actual trends.
- NEVER mention a field as "unavailable", "not provided", or "data not found". Simply omit it.
- Never use raw data field names in the report. Do not write field names like churn_trend, cash_runway_months, avg_deal_size_trend, or any other underscore-separated name. Translate into plain English.
- Write the entire report in first-person plural. Use 'we reviewed,' 'we identified,' 'we recommend,' and 'in our view' throughout.`;

const SYSTEM_ADVANCED = `You are a senior business consultant with 20 years of experience advising companies ranging from startups to Fortune 500s. You have just reviewed your client's data and are delivering your assessment in person. You speak directly, confidently, and without jargon. You give real recommendations, not observations. You never say 'it appears' or 'data suggests'. You say what you see and what you'd do about it. Your client is not a financial expert. They are a business owner or organization leader who needs to understand what is happening and what to do next, in plain language. Analyze only what the data actually shows. Never reference metrics that are null, unavailable, or absent from the data. Omit them entirely. Do not use placeholder language like "data unavailable" or "not provided".

Return ONLY valid JSON with this exact structure. No explanation, no markdown, no code fences.

{
  "summary": "string",
  "flags": [{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],
  "recommendations": [{"title":"string","detail":"string","priority":"high|medium|low"}],
  "trajectoryNote": "string",
  "trendData": {
    "label": "string",
    "series": [{"name":"string","values":[0,0,0,0,0,0]}],
    "labels": ["","","","","",""]
  },
  "industryComparisons": [{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}],
  "scenarios": {"optimistic":"string","base":"string","pessimistic":"string"},
  "riskMatrix": [{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}],
  "caseStudies": [{"organization":"string","challenge":"string","solution":"string","outcome":"string","source":"string"}],
  "actionPlan": {"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}
}

Rules:
- flags: 3-5 items. Only flag real data points. Each description under 40 words. Metric must be a specific value from the data.
- recommendations: 3-4 items, specific to this org's actual situation. Under 40 words each.
- summary: 2-3 sentences. Name specific numbers. No generic statements.
- trajectoryNote: 1-2 sentences grounded in actual trends from the data.
- trendData: Exactly 6 labels and 6 values per series. Use real date/period labels from the data. 2 series max (e.g. Revenue vs Expenses). Values must reflect actual data. Do not fabricate.
- industryComparisons: 3 entries benchmarked to this org's specific sector. Use realistic industry averages for the sector. For nonprofits, only include "Program Expense Ratio" if there is a column explicitly named "program_expenses", "program_costs", or "direct_service_costs". Never substitute "operating_expenses", "admin_expenses", or general overhead columns as a proxy for program expenses. If no clearly labeled program expense column is present, omit this benchmark entirely and substitute a more appropriate metric.
- scenarios: 2 sentences each. Ground optimistic/pessimistic in actual identified risks and opportunities.
- riskMatrix: 3 risks, each under 30 words. Based on actual flags found in the data.
- caseStudies: 1-2 entries. Do NOT fabricate specific named organizations or invent outcomes. Use a real documented case with a verifiable citation (e.g. "HBR, 2019"), OR set organization to "Illustrative example" and omit the source field entirely. Never invent organization names, challenge details, or outcomes. Keep challenge/solution/outcome under 20 words each.
- actionPlan: 2 items per phase (immediate/shortTerm/longTerm), each under 25 words. Specific to this org.
- Never use raw data field names in the report. Do not write words like churn_trend, contraction_revenue_trend, nps_trend, cash_runway_months, avg_deal_size_trend, sales_cycle_trend, customer_count_trend, or any other underscore-separated field name in the report body. Translate all field references into plain English. For example: 'churn_trend' becomes 'your customer retention rate', 'contraction_revenue_trend' becomes 'revenue lost to customer downgrades', 'cash_runway_months' becomes 'months of cash remaining.'
- Write the entire report in first-person plural. Use 'we reviewed,' 'we identified,' 'our assessment,' 'we recommend,' and 'in our view' throughout. The report should read as if a team of senior consultants prepared and signed off on it together.`;

function extractJson(text: string): object {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in to run analyses." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  type SectionsConfig = { executiveSummary: boolean; recommendations: boolean; benchmarks: boolean; trajectory: boolean; riskMatrix: boolean };
  const DEFAULT_SECTIONS: SectionsConfig = { executiveSummary: true, recommendations: true, benchmarks: true, trajectory: true, riskMatrix: true };

  let rawText: string, fileName: string, orgName: string, mode: string;
  let companySize: string, industry: string, constraints: string, extraContext: string, profileId: string;
  let sections: SectionsConfig = { ...DEFAULT_SECTIONS };
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
    mode = (fd.get("mode") as string) ?? "basic";
    companySize = (fd.get("companySize") as string) ?? "";
    industry = (fd.get("industry") as string) ?? "";
    constraints = (fd.get("constraints") as string) ?? "";
    extraContext = (fd.get("extraContext") as string) ?? "";
    profileId = (fd.get("profileId") as string) ?? "";
    const sectionsStr = fd.get("sections") as string;
    if (sectionsStr) { try { sections = { ...DEFAULT_SECTIONS, ...JSON.parse(sectionsStr) }; } catch {} }
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
    mode = body.mode ?? "basic";
    companySize = body.companySize ?? "";
    industry = body.industry ?? "";
    constraints = body.constraints ?? "";
    extraContext = body.extraContext ?? "";
    profileId = body.profileId ?? "";
    if (body.sections) { try { sections = { ...DEFAULT_SECTIONS, ...body.sections }; } catch {} }
  }

  if (!rawText) {
    return new Response(JSON.stringify({ error: "No financial data provided." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("account_type").eq("id", user.id).single(),
    supabase.from("daily_usage").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
  ]);

  const accountType = (profile?.account_type ?? "free") as keyof typeof LIMITS;
  const limits = LIMITS[accountType] ?? LIMITS.free;
  const basicUsed = usage?.basic_count ?? 0;
  const advancedUsed = usage?.advanced_count ?? 0;

  if (mode === "basic" && basicUsed >= limits.basic) {
    return new Response(JSON.stringify({ error: `Daily basic limit reached (${limits.basic}/day).` }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }
  if (mode === "advanced" && advancedUsed >= limits.advanced) {
    return new Response(JSON.stringify({ error: `Daily advanced limit reached (${limits.advanced}/day).` }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch historical context from profile if provided
  let historicalContext = "";
  if (profileId) {
    try {
      const { data: metricsRows } = await supabase
        .from("profile_metrics")
        .select("period_label, metric_name, metric_value")
        .eq("profile_id", profileId)
        .order("period_label", { ascending: true });

      if (metricsRows?.length) {
        const seriesMap: Record<string, Record<string, number>> = {};
        const periodsSet = new Set<string>();
        for (const row of metricsRows) {
          if (!seriesMap[row.metric_name]) seriesMap[row.metric_name] = {};
          seriesMap[row.metric_name][row.period_label] = Number(row.metric_value);
          periodsSet.add(row.period_label);
        }
        const periods = Array.from(periodsSet).sort().slice(-6);
        const lines = ["Historical trend data:"];
        for (const [metricName, periodValues] of Object.entries(seriesMap)) {
          const entries = periods.map(p => `${p}: ${periodValues[p] ?? "N/A"}`).join(", ");
          lines.push(`  ${metricName}: ${entries}`);
        }
        historicalContext = lines.join("\n");
      }
    } catch {}
  }

  // Deduplicate CSV before analysis
  let dedupStats = { removedExact: 0, removedNearDupe: 0, removedSummary: 0 };
  try {
    const parsed = Papa.parse<Record<string, string>>(rawText, { header: true, skipEmptyLines: true });
    const headers = parsed.meta.fields ?? [];
    const rows = parsed.data;
    if (headers.length && rows.length) {
      const deduped = deduplicateCSV(rows, headers);
      dedupStats = { removedExact: deduped.removedExact, removedNearDupe: deduped.removedNearDupe, removedSummary: deduped.removedSummary };
      if (deduped.removedExact + deduped.removedNearDupe + deduped.removedSummary > 0) {
        rawText = [headers.join(","), ...deduped.rows.map(r => headers.map((h: string) => r[h] ?? "").join(","))].join("\n");
      }
    }
  } catch { /* non-fatal: proceed with original rawText */ }

  const summary = summarize(rawText, mode);
  const contextLines = [
    companySize && `Company Size: ${companySize}`,
    industry && `Industry/Sector: ${industry}`,
    constraints && `Key Constraints: ${constraints}`,
    extraContext && `Additional Context: ${extraContext}`,
    historicalContext && historicalContext,
  ].filter(Boolean).join("\n");

  // Server-side aggregation: works on the full dataset, constant output size regardless of file size.
  const aggregated = aggregateCSV(rawText);

  // Fix 2: compute cash_runway_months server-side so it is never null due to Claude guessing.
  const findLastNum = (candidates: string[]): number | null => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const candidate of candidates) {
      const needle = normalize(candidate);
      const key = Object.keys(aggregated.columns).find(k => normalize(k) === needle || normalize(k).includes(needle));
      if (key) {
        const col = aggregated.columns[key];
        const n = typeof col.last === "number" ? col.last : Number(String(col.last).replace(/[,$% ]/g, ""));
        if (!isNaN(n) && isFinite(n)) return n;
      }
    }
    return null;
  };

  const cash = findLastNum(["cash_and_equivalents", "cashandequivalents", "cash_equivalents", "cash"]);
  const opex = findLastNum(["operating_expenses", "operatingexpenses", "total_operating_expenses", "opex"]);
  aggregated.cash_runway_months = (cash !== null && opex !== null && opex > 0)
    ? Math.round((cash / opex) * 10) / 10
    : null;

  let preAnalysisJson: object = {};
  try {
    const preAnalysisMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    temperature: 0,
    system: "You are a financial data analyst. Return only raw JSON. No prose, no markdown, no code fences.",
    messages: [{
      role: "user",
      content: `Compute and return ONLY a JSON object with this exact structure. Fill every field using the aggregated statistics provided. For fields where a column is not present, use null.\n\n\`\`\`\n{\n  "columns_present": [],\n  "date_range": { "start": "", "end": "" },\n  "yoy_revenue_growth": { "2022_to_2023": "", "2023_to_2024": "" },\n  "gross_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "ebitda_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "net_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "churn_trend": { "earliest": "", "latest": "", "worst_period": "", "direction": "" },\n  "customer_count_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "avg_deal_size_trend": { "earliest": "", "latest": "", "direction": "" },\n  "sales_cycle_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "nps_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "contraction_revenue_trend": { "earliest": "", "latest": "", "direction": "" },\n  "cash_runway_months": "${aggregated.cash_runway_months ?? "null: columns not found"}",\n  "contradictions_detected": [],\n  "capex_pattern": ""\n}\n\`\`\`\n\nAggregated statistics:\n${JSON.stringify(aggregated)}`,
    }],
    });
    const preAnalysisText = preAnalysisMsg.content[0].type === "text" ? preAnalysisMsg.content[0].text : "{}";
    try { preAnalysisJson = extractJson(preAnalysisText); } catch { /* leave as {} */ }
  } catch (e: unknown) {
    if ((e as { status?: number })?.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a minute and try again." }), {
        status: 429, headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Pre-analysis error (non-fatal):", e);
  }

  // Inject the server-computed cash runway so it always appears in the report prompt,
  // overwriting whatever Claude returned (which may have been null or guessed).
  (preAnalysisJson as Record<string, unknown>).cash_runway_months = aggregated.cash_runway_months;

  const userMessage = `Organization: ${orgName || "Unknown"}
File: ${fileName}${contextLines ? `\n${contextLines}` : ""}

Aggregated statistics (computed from full dataset, use these as ground truth):
${JSON.stringify(preAnalysisJson)}

Raw data sample:
${summary}

Instructions:
- Cross-reference the aggregated stats with the raw sample to identify real trends and anomalies.
- Only include metrics and flags where you have actual data values.
- If a field in the aggregated stats is null, skip it entirely. Do not mention it.
- Contradictions between metrics (e.g. member count rising while dues revenue falls) should each become their own flag.`;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let resultJson: object;

        if (mode === "advanced") {
          const sectionInstructions: string[] = [];
          const jsonFields: string[] = [
            `"flags": [{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}]`,
          ];

          if (sections.executiveSummary) {
            sectionInstructions.push(`EXECUTIVE SUMMARY (field: "summary"):
Identify the 3-5 most important trends and discrepancies in the data.
Be purely observational. Do NOT include recommendations, suggestions, or action items. Describe only what the data shows — the most significant trends and discrepancies.`);
            jsonFields.unshift(`"summary": "string"`);
          }
          if (sections.recommendations) {
            sectionInstructions.push(`RECOMMENDATIONS (field: "recommendations"):
Provide 3-4 prioritized, specific action items tailored to this organization's actual situation. Under 40 words each.`);
            sectionInstructions.push(`ACTION PLAN (field: "actionPlan"):
2 items per phase (immediate/shortTerm/longTerm), each under 25 words. Specific to this org.`);
            sectionInstructions.push(`CASE STUDIES (field: "caseStudies"):
1-2 entries. Do NOT fabricate specific named organizations. Use a real documented case with a verifiable citation, OR set organization to "Illustrative example" and omit source. Keep challenge/solution/outcome under 20 words each.`);
            jsonFields.push(`"recommendations": [{"title":"string","detail":"string","priority":"high|medium|low"}]`);
            jsonFields.push(`"caseStudies": [{"organization":"string","challenge":"string","solution":"string","outcome":"string","source":"string"}]`);
            jsonFields.push(`"actionPlan": {"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}`);
          }
          if (sections.benchmarks) {
            sectionInstructions.push(`INDUSTRY BENCHMARKS (field: "industryComparisons"):
3 entries benchmarked to this org's specific sector. Use realistic industry averages. For nonprofits, only include "Program Expense Ratio" if there is a column explicitly named program_expenses, program_costs, or direct_service_costs — never substitute general overhead columns.
Also include trend chart data (field: "trendData"): Exactly 6 labels and 6 values per series. Use real date/period labels. 2 series max. Values must reflect actual data.`);
            jsonFields.push(`"trendData": {"label":"string","series":[{"name":"string","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]}`);
            jsonFields.push(`"industryComparisons": [{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}]`);
          }
          if (sections.trajectory) {
            sectionInstructions.push(`WHERE THIS IS HEADING (fields: "trajectoryNote" and "scenarios"):
trajectoryNote: 1-2 sentences grounded in actual trends from the data.
scenarios: 2 sentences each. Ground optimistic/pessimistic in actual identified risks and opportunities.`);
            jsonFields.push(`"trajectoryNote": "string"`);
            jsonFields.push(`"scenarios": {"optimistic":"string","base":"string","pessimistic":"string"}`);
          }
          if (sections.riskMatrix) {
            sectionInstructions.push(`RISK MATRIX (field: "riskMatrix"):
3 risks, each under 30 words. Based on actual flags found in the data. Ranked by likelihood and impact, with mitigation strategies.`);
            jsonFields.push(`"riskMatrix": [{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}]`);
          }

          const dynamicSchema = `{\n  ${jsonFields.join(",\n  ")}\n}`;
          const sectionsPrompt = sectionInstructions.length
            ? `\nGenerate ONLY the following sections — do not include any sections not listed here:\n${sectionInstructions.join("\n\n")}`
            : "";

          const dynamicSystem = `${SYSTEM_ADVANCED.replace(/Return ONLY valid JSON with this exact structure[\s\S]*?Write the entire report in first-person plural[\s\S]*?together\./, `Return ONLY valid JSON with this exact structure. No explanation, no markdown, no code fences.\n\n${dynamicSchema}\n\nRules:\n- flags: 3-5 items. Only flag real data points. Each description under 40 words. Metric must be a specific value from the data.\n- summary (if included): Be purely observational. Do NOT include recommendations, suggestions, or action items. Describe only what the data shows.\n- recommendations (if included): 3-4 items, specific to this org's actual situation. Under 40 words each.\n- industryComparisons (if included): 3 entries benchmarked to this org's specific sector. Use realistic industry averages for the sector.\n- scenarios (if included): 2 sentences each. Ground optimistic/pessimistic in actual identified risks and opportunities.\n- riskMatrix (if included): 3 risks, each under 30 words. Based on actual flags found in the data.\n- caseStudies (if included): Do NOT fabricate specific named organizations or invent outcomes.\n- actionPlan (if included): 2 items per phase (immediate/shortTerm/longTerm), each under 25 words.\n- Never use raw data field names in the report. Translate all field references into plain English.\n- Write the entire report in first-person plural. Use 'we reviewed,' 'we identified,' 'our assessment,' 'we recommend,' and 'in our view' throughout. The report should read as if a team of senior consultants prepared and signed off on it together.`)}${sectionsPrompt}`;

          const advancedMsg = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 6000,
            temperature: 0,
            system: dynamicSystem,
            messages: [{ role: "user", content: userMessage }],
          });
          const advancedText = advancedMsg.content[0].type === "text" ? advancedMsg.content[0].text : "{}";
          try { resultJson = extractJson(advancedText); } catch (e) { console.error("advanced extractJson failed:", e, advancedText.slice(0, 200)); resultJson = {}; }
        } else {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
            temperature: 0,
            system: SYSTEM_BASIC,
            messages: [{ role: "user", content: userMessage }],
          });
          const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
          let basicJson = {};
          try { basicJson = extractJson(text); } catch (e) { console.error("basic extractJson failed:", e); }
          resultJson = basicJson;
        }

        const sectionsConfig = mode === "advanced" ? sections : undefined;
        controller.enqueue(enc.encode(JSON.stringify({ ...resultJson, dedupStats, ...(sectionsConfig ? { sections_config: sectionsConfig } : {}) })));

        // Update usage count
        try {
          if (usage) {
            await supabase.from("daily_usage")
              .update(mode === "basic" ? { basic_count: basicUsed + 1 } : { advanced_count: advancedUsed + 1 })
              .eq("id", usage.id);
          } else {
            await supabase.from("daily_usage").insert({
              user_id: user.id,
              date: today,
              basic_count: mode === "basic" ? 1 : 0,
              advanced_count: mode === "advanced" ? 1 : 0,
            });
          }
        } catch (dbErr) {
          console.error("DB update error (non-fatal):", dbErr);
        }
      } catch (err) {
        const is429 = (err as { status?: number })?.status === 429;
        const errMsg = is429
          ? "Rate limit reached. Please wait a minute and try again."
          : err instanceof Error ? `${err.constructor.name}: ${err.message}` : String(err);
        console.error("Stream error:", errMsg);
        controller.enqueue(enc.encode(`\n__STREAM_ERROR__:${errMsg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
