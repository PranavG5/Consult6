import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic();

const LIMITS = {
  free: { basic: 3, advanced: 1 },
  paid: { basic: 10, advanced: 3 },
  enterprise: { basic: 50, advanced: 20 },
  admin: { basic: 999999, advanced: 999999 },
};

const SYSTEM_BASIC = `You are a senior financial analyst. Tailor all analysis to the organisation described. Return ONLY valid JSON matching this exact structure — no explanation, no markdown, no preamble:
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: summary 1-2 sentences with a quantified finding. flags 2-4 entries — compute YoY growth rates and margins numerically; every description cites a computed value and the period it covers; metric is an exact figure from the data; analyse every column including operational KPIs like churn_rate, nps_score, avg_deal_size. Flag any confirmed cross-metric contradiction as CRITICAL or WARNING naming the specific periods: revenue rising + churn rising = "Fragile Growth"; customer count up + avg deal size down = "Volume vs. Value Divergence"; revenue up + EBITDA margin compressing = "Profitless Growth". recommendations 2-3 entries each citing a named flag. trajectoryNote 1 sentence with a computed rate.`;

const SYSTEM_ADVANCED_CORE = `You are a senior financial analyst. Tailor all analysis to the organisation described. Return ONLY valid JSON matching this exact structure — no explanation, no markdown, no preamble:
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: summary 2 sentences with quantified findings. flags 3-6 entries covering all cross-metric contradictions found — compute YoY growth rates and margins numerically; every description cites computed values and specific periods; metric is an exact figure; analyse every column including churn_rate, nps_score, avg_deal_size, sales_cycle_days. Confirmed contradictions must be CRITICAL or WARNING naming specific periods: revenue rising + churn rising = "Fragile Growth"; customer count up + avg deal size down = "Volume vs. Value Divergence"; revenue up + EBITDA margin compressing = "Profitless Growth"; revenue up + sales cycle days rising = "Sales Strain"; NPS improving + net margin declining = "Satisfaction-Monetization Gap". recommendations 3-5 entries each citing a named flag. trajectoryNote 1-2 sentences with computed rates.`;

const SYSTEM_ADVANCED_CONTEXT = `You are a senior financial analyst. Tailor all analysis to the organisation described. Return ONLY valid JSON matching this exact structure — no explanation, no markdown, no preamble:
{"trendData":{"label":"string","series":[{"name":"string","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]},"industryComparisons":[{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}],"caseStudies":[{"organization":"string","challenge":"string","solution":"string","outcome":"string","source":"string"}],"scenarios":{"optimistic":"string","base":"string","pessimistic":"string"},"riskMatrix":[{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}],"actionPlan":{"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}}
Rules: trendData exactly 6 labels/values per series using actual data columns, 2 series. industryComparisons only if business model is identifiable from the data — omit key if uncertain. caseStudies 1-2 real documented companies with comparable model; source must be a real citation. scenarios each sentence states the specific historical YoY rate it uses and the period it comes from — derive all rates from the data. riskMatrix 3-4 risks linked to flags. actionPlan 2-3 items per phase referencing specific data findings; all three arrays (immediate, shortTerm, longTerm) must be present even if empty.`;

function extractDateRange(rawText: string): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return "";
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const firstRow = lines[1].split(",");
  const lastRow = lines[lines.length - 1].split(",");
  const dateIdx = headers.findIndex((h, i) => {
    const v = (firstRow[i] ?? "").trim();
    return /date|period|month|year|quarter/i.test(h)
      || /^\d{4}[-/]\d{1,2}/.test(v)
      || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v);
  });
  if (dateIdx === -1) return "";
  const first = firstRow[dateIdx]?.trim() ?? "";
  const last = lastRow[dateIdx]?.trim() ?? "";
  return first && last && first !== last ? `${first} to ${last}` : first;
}

function buildUserMessage(rawText: string, orgName: string, fileName: string, contextLines: string): string {
  const headerRow = rawText.trim().split("\n")[0] ?? "";
  const dateRange = extractDateRange(rawText);
  const parts = [
    `Organization: ${orgName || "Unknown"}`,
    `File: ${fileName}`,
    ...(contextLines ? [contextLines] : []),
    "",
    `Column headers: ${headerRow}`,
    ...(dateRange ? [`Date range: ${dateRange}`] : []),
    "",
    "Full data:",
    rawText,
  ];
  return parts.join("\n");
}

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Model did not return JSON. Response: ${text.slice(0, 300)}`);
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function ensureArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function normalizeResult(raw: Record<string, unknown>): object {
  const ap = raw.actionPlan as Record<string, unknown> | undefined;
  return {
    summary: raw.summary ?? "",
    flags: ensureArray(raw.flags),
    recommendations: ensureArray(raw.recommendations),
    trajectoryNote: raw.trajectoryNote ?? "",
    ...(raw.trendData ? { trendData: raw.trendData } : {}),
    ...(raw.industryComparisons ? { industryComparisons: ensureArray(raw.industryComparisons) } : {}),
    ...(raw.caseStudies ? { caseStudies: ensureArray(raw.caseStudies) } : {}),
    ...(raw.scenarios ? { scenarios: raw.scenarios } : {}),
    ...(raw.riskMatrix ? { riskMatrix: ensureArray(raw.riskMatrix) } : {}),
    ...(ap ? { actionPlan: { immediate: ensureArray(ap.immediate), shortTerm: ensureArray(ap.shortTerm), longTerm: ensureArray(ap.longTerm) } } : {}),
  };
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

  const contextLines = [
    companySize && `Company Size: ${companySize}`,
    industry && `Industry/Sector: ${industry}`,
    constraints && `Key Constraints: ${constraints}`,
    extraContext && `Additional Context: ${extraContext}`,
  ].filter(Boolean).join("\n");

  const userMessage = buildUserMessage(rawText, orgName, fileName, contextLines);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let resultJson: object;

        if (mode === "advanced") {
          const [coreMsg, contextMsg] = await Promise.all([
            anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 1400,
              temperature: 0,
              system: SYSTEM_ADVANCED_CORE,
              messages: [{ role: "user", content: userMessage }],
            }),
            anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 2000,
              temperature: 0,
              system: SYSTEM_ADVANCED_CONTEXT,
              messages: [{ role: "user", content: userMessage }],
            }),
          ]);

          const coreText = coreMsg.content[0].type === "text" ? coreMsg.content[0].text : "{}";
          const contextText = contextMsg.content[0].type === "text" ? contextMsg.content[0].text : "{}";
          resultJson = normalizeResult({ ...extractJson(coreText), ...extractJson(contextText) });
        } else {
          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            temperature: 0,
            system: SYSTEM_BASIC,
            messages: [{ role: "user", content: userMessage }],
          });
          const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
          resultJson = normalizeResult(extractJson(text));
        }

        controller.enqueue(enc.encode(JSON.stringify(resultJson)));

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
        console.error("Stream error:", err);
        controller.enqueue(enc.encode("\n__STREAM_ERROR__"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
