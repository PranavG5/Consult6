import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic();

const LIMITS = {
  free: { basic: 5, advanced: 2 },
  paid: { basic: 15, advanced: 5 },
  admin: { basic: 999999, advanced: 999999 },
};

function summarize(rawText: string, mode: string = "basic"): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";
  const maxCols = mode === "advanced" ? 20 : 10;
  const maxRows = mode === "advanced" ? 25 : 9;
  const charLimit = mode === "advanced" ? 2500 : 900;
  const headers = lines[0].split(",").slice(0, maxCols).join(",");
  const rows = lines.slice(1, maxRows).map(r => r.split(",").slice(0, maxCols).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample:\n${rows}`.slice(0, charLimit);
}

const SYSTEM_BASIC = `You are a financial analyst. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules:
- summary: 2-3 sentences with specific observations referencing actual figures from the data
- flags: 3-5 flags; each description must cite a specific number, ratio, or trend from the data, under 45 words
- metric: include the actual value or calculated ratio (e.g. "Debt-to-equity: 2.4x", "Revenue growth: -12%")
- recommendations: 3-4 concrete, actionable recommendations with a specific implementation step, each under 45 words
- trajectoryNote: 2-3 sentences describing the likely financial direction with a quantified outlook`;

const SYSTEM_ADVANCED = `You are an expert financial analyst. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string","trendData":{"label":"string","series":[{"name":"string","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]},"industryComparisons":[{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}],"caseStudies":[{"organization":"string","challenge":"string","solution":"string","outcome":"string"}],"scenarios":{"optimistic":"string","base":"string","pessimistic":"string"},"riskMatrix":[{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}],"actionPlan":{"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}}
Rules:
- summary: 3-5 sentences with deep analysis referencing multiple specific data points and their interplay
- flags: 5-7 flags; each description must cite specific metrics, explain root cause, and state consequences, under 65 words each
- metric: include the actual calculated value and context (e.g. "Current ratio: 0.8 vs 1.5 benchmark — 47% below safe threshold")
- recommendations: 4-6 recommendations with detailed implementation steps, owner, timeline, and expected outcome, each under 65 words
- trajectoryNote: 3-4 sentences with quantified projections and key assumptions
- trendData: exactly 6 labels and 6 values per series, 2-3 series reflecting actual data patterns; use realistic scaled numbers
- industryComparisons: 4-5 comparisons using realistic sector benchmarks with precise values
- caseStudies: 2-3 comparable real or realistic organizations; outcomes must include specific measurable results (%, $, timeframe), each field under 40 words
- scenarios: 3-4 sentences each with quantified projections and the key drivers behind each scenario
- riskMatrix: 4-5 risks with specific, actionable mitigation strategies, each under 45 words
- actionPlan: 3-4 items per phase (immediate=0-30 days, shortTerm=30-90 days, longTerm=90+ days); each item under 30 words and tied to a specific flag or recommendation`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in to run analyses." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  let rawText: string, fileName: string, orgName: string, mode: string;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
    mode = (fd.get("mode") as string) ?? "basic";
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
    mode = body.mode ?? "basic";
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
  const userMessage = `Organization: ${orgName || "Unknown"}\nFile: ${fileName}\n\nData:\n${summary}`;
  const system = mode === "advanced" ? SYSTEM_ADVANCED : SYSTEM_BASIC;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: mode === "advanced" ? 3500 : 1200,
          system,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const chunk of s) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(enc.encode(chunk.delta.text));
          }
        }

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
        console.error("Stream error:", err);
        controller.enqueue(enc.encode("\n__STREAM_ERROR__"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
