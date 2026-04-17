import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

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
  const maxCols = mode === "advanced" ? 12 : 10;
  const maxRows = mode === "advanced" ? 12 : 9;
  const charLimit = mode === "advanced" ? 1200 : 900;
  const headers = lines[0].split(",").slice(0, maxCols).join(",");
  const rows = lines.slice(1, maxRows).map(r => r.split(",").slice(0, maxCols).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample:\n${rows}`.slice(0, charLimit);
}

// Trimmed CSV for the pre-analysis call: keep more rows/cols than summarize() so
// trends can be computed, but hard-cap the size so a 1MB file cannot blow through
// Anthropic's rate limit. max_tokens only caps output; input must be trimmed here.
function trimForPreAnalysis(rawText: string): string {
  const MAX_CHARS = 8000;
  if (rawText.length <= MAX_CHARS) return rawText;
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "";
  const header = lines[0];
  const rows = lines.slice(1);
  const kept: string[] = [];
  let used = header.length + 1;
  for (const r of rows) {
    if (used + r.length + 1 > MAX_CHARS) break;
    kept.push(r);
    used += r.length + 1;
  }
  return `${header}\n${kept.join("\n")}`;
}

const SYSTEM_BASIC = `You are a financial analyst. Tailor all analysis specifically to the organization described. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: 2-4 flags with descriptions under 30 words each, metric as a specific value or ratio. 2-3 recommendations under 30 words each that are realistic for this specific organization. Summary 1-2 sentences. trajectoryNote 1 sentence.`;

// Advanced is split into two parallel calls to double the effective token budget.
const SYSTEM_ADVANCED_CORE = `You are an expert financial analyst. Tailor all analysis to the organization's size, industry, and constraints. Return ONLY valid JSON. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: 3-5 flags under 35 words each with a specific metric value. 3-4 recommendations under 35 words each tailored to this specific organization. Summary 2 sentences. trajectoryNote 1-2 sentences.`;

const SYSTEM_ADVANCED_CONTEXT = `You are an expert financial analyst. Tailor all sections to the organization's industry, size, and constraints. Return ONLY valid JSON. No explanation, no markdown.
{"trendData":{"label":"string","series":[{"name":"string","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]},"industryComparisons":[{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}],"caseStudies":[{"organization":"string","challenge":"string","solution":"string","outcome":"string","source":"string"}],"scenarios":{"optimistic":"string","base":"string","pessimistic":"string"},"riskMatrix":[{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}],"actionPlan":{"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}}
Rules: trendData exactly 6 labels/values per series, 2 series reflecting data patterns. industryComparisons 3 entries benchmarked to org's specific industry. caseStudies 1-2 real documented orgs, each field under 20 words, source must be a real specific citation (e.g. "HBR, 2019", "Bloomberg, March 2021"). scenarios 1-2 sentences each. riskMatrix 3 risks under 25 words each. actionPlan 2 items per phase under 20 words each.`;

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

  let rawText: string, fileName: string, orgName: string, mode: string;
  let companySize: string, industry: string, constraints: string, extraContext: string;
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

  const summary = summarize(rawText, mode);
  const contextLines = [
    companySize && `Company Size: ${companySize}`,
    industry && `Industry/Sector: ${industry}`,
    constraints && `Key Constraints: ${constraints}`,
    extraContext && `Additional Context: ${extraContext}`,
  ].filter(Boolean).join("\n");

  let preAnalysisJson: object = {};
  try {
    const preAnalysisMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    temperature: 0,
    system: "You are a financial data analyst. Return only raw JSON. No prose, no markdown, no code fences.",
    messages: [{
      role: "user",
      content: `Compute and return ONLY a JSON object with this exact structure. Fill every field using the CSV data provided. For fields where a column is not present in the CSV, use null.\n\n\`\`\`\n{\n  "columns_present": [],\n  "date_range": { "start": "", "end": "" },\n  "yoy_revenue_growth": { "2022_to_2023": "", "2023_to_2024": "" },\n  "gross_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "ebitda_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "net_margin_trend": { "earliest": "", "latest": "", "direction": "" },\n  "churn_trend": { "earliest": "", "latest": "", "worst_period": "", "direction": "" },\n  "customer_count_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "avg_deal_size_trend": { "earliest": "", "latest": "", "direction": "" },\n  "sales_cycle_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "nps_trend": { "earliest": 0, "latest": 0, "direction": "" },\n  "contraction_revenue_trend": { "earliest": "", "latest": "", "direction": "" },\n  "cash_runway_months": "",\n  "contradictions_detected": [],\n  "capex_pattern": ""\n}\n\`\`\`\n\nCSV data:\n${trimForPreAnalysis(rawText)}`,
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

  const userMessage = `Organization: ${orgName || "Unknown"}\nFile: ${fileName}${contextLines ? `\n${contextLines}` : ""}\n\nPre-computed analysis summary — you MUST reference every single field in this JSON somewhere in the report. If a field shows a negative or worsening trend, it must appear as a flag. Do not skip any field. Do not write a section without checking whether any JSON field belongs in it.\nFields that must each appear at least once by name in the report:\n\ncustomer_count_trend\nnps_trend\ncontraction_revenue_trend\nchurn_trend (include the worst_period value explicitly)\ncash_runway_months (state the exact number)\navg_deal_size_trend\nsales_cycle_trend\ncontradictions_detected (list each one as its own flag)\n\n${JSON.stringify(preAnalysisJson)}\n\nData:\n${summary}`;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let resultJson: object;

        if (mode === "advanced") {
          // Two parallel calls: core analysis + context sections
          const [coreMsg, contextMsg] = await Promise.all([
            anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 2000,
              system: SYSTEM_ADVANCED_CORE,
              messages: [{ role: "user", content: userMessage }],
            }),
            anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 3000,
              system: SYSTEM_ADVANCED_CONTEXT,
              messages: [{ role: "user", content: userMessage }],
            }),
          ]);

          const coreText = coreMsg.content[0].type === "text" ? coreMsg.content[0].text : "{}";
          const contextText = contextMsg.content[0].type === "text" ? contextMsg.content[0].text : "{}";
          let coreJson = {}; let ctxJson = {};
          try { coreJson = extractJson(coreText); } catch (e) { console.error("core extractJson failed:", e, coreText.slice(0, 200)); }
          try { ctxJson = extractJson(contextText); } catch (e) { console.error("ctx extractJson failed:", e, contextText.slice(0, 200)); }
          resultJson = { ...coreJson, ...ctxJson };
        } else {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 900,
            system: SYSTEM_BASIC,
            messages: [{ role: "user", content: userMessage }],
          });
          const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
          let basicJson = {};
          try { basicJson = extractJson(text); } catch (e) { console.error("basic extractJson failed:", e); }
          resultJson = basicJson;
        }

        controller.enqueue(enc.encode(JSON.stringify(resultJson)));

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
