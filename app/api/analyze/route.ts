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
  const maxCols = mode === "advanced" ? 12 : 10;
  const maxRows = mode === "advanced" ? 12 : 9;
  const charLimit = mode === "advanced" ? 1200 : 900;
  const headers = lines[0].split(",").slice(0, maxCols).join(",");
  const rows = lines.slice(1, maxRows).map(r => r.split(",").slice(0, maxCols).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample:\n${rows}`.slice(0, charLimit);
}

const SYSTEM_BASIC = `You are a financial analyst. Tailor all analysis specifically to the organization described. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: 2-4 flags with descriptions under 30 words each, metric as a specific value or ratio. 2-3 recommendations under 30 words each that are realistic for this specific organization. Summary 1-2 sentences. trajectoryNote 1 sentence.`;

const SYSTEM_ADVANCED = `You are an expert financial analyst. Tailor every section — flags, recommendations, benchmarks, case studies, scenarios, risks, and action plan — specifically to the organization's size, industry, and constraints provided. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string","trendData":{"label":"string","series":[{"name":"string","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]},"industryComparisons":[{"metric":"string","yourValue":"string","industryAverage":"string","topQuartile":"string","status":"above_average|average|below_average"}],"caseStudies":[{"organization":"string","challenge":"string","solution":"string","outcome":"string"}],"scenarios":{"optimistic":"string","base":"string","pessimistic":"string"},"riskMatrix":[{"risk":"string","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":"string"}],"actionPlan":{"immediate":["string"],"shortTerm":["string"],"longTerm":["string"]}}
Rules: 3-5 flags under 35 words each with a specific metric value. 3-4 recommendations under 35 words each. Summary 2 sentences. trajectoryNote 1-2 sentences. trendData: exactly 6 labels and 6 values per series, 2 series. industryComparisons: 3 entries benchmarked against the organization's specific industry. caseStudies: 1-2 entries of comparable organizations in the same industry/size. scenarios: 1-2 sentences each. riskMatrix: 3 risks under 25 words each. actionPlan: 2 items per phase, each under 20 words.`;

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
  const userMessage = `Organization: ${orgName || "Unknown"}\nFile: ${fileName}${contextLines ? `\n${contextLines}` : ""}\n\nData:\n${summary}`;
  const system = mode === "advanced" ? SYSTEM_ADVANCED : SYSTEM_BASIC;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: mode === "advanced" ? 2500 : 900,
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
