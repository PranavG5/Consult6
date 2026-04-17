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
  const maxCols = mode === "advanced" ? 8 : 6;
  const maxRows = mode === "advanced" ? 8 : 6;
  const charLimit = mode === "advanced" ? 700 : 500;
  const headers = lines[0].split(",").slice(0, maxCols).join(",");
  const rows = lines.slice(1, maxRows + 1).map(r => r.split(",").slice(0, maxCols).join(",")).join("\n");
  return `${lines.length - 1}r,${lines[0].split(",").length}c\n${headers}\n${rows}`.slice(0, charLimit);
}

const SYSTEM_BASIC = `Return ONLY valid JSON, no markdown.
{"summary":"","flags":[{"title":"","severity":"critical|warning|info","description":"","metric":""}],"recommendations":[{"title":"","detail":"","priority":"high|medium|low"}],"trajectoryNote":""}
2-4 flags(≤20w each),2-3 recs(≤20w each),1-2 sentence summary.`;

const SYSTEM_ADVANCED = `Return ONLY valid JSON, no markdown.
{"summary":"","flags":[{"title":"","severity":"critical|warning|info","description":"","metric":""}],"recommendations":[{"title":"","detail":"","priority":"high|medium|low"}],"trajectoryNote":"","trendData":{"label":"","series":[{"name":"","values":[0,0,0,0,0,0]},{"name":"","values":[0,0,0,0,0,0]}],"labels":["","","","","",""]},"industryComparisons":[{"metric":"","yourValue":"","industryAverage":"","topQuartile":"","status":"above_average|average|below_average"}],"caseStudies":[{"organization":"","challenge":"","solution":"","outcome":"","source":""}],"scenarios":{"optimistic":"","base":"","pessimistic":""},"riskMatrix":[{"risk":"","likelihood":"high|medium|low","impact":"high|medium|low","mitigation":""}],"actionPlan":{"immediate":[""],"shortTerm":[""],"longTerm":[""]}}
3-5 flags(≤25w),3-4 recs(≤25w). trendData:2 series,6pts each. industryComparisons:3 items. caseStudies:1-2 real orgs,≤15w/field,real citation. scenarios:1 sentence each. riskMatrix:3 items(≤20w). actionPlan:2 items/phase(≤15w).`;

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

  const dataSummary = summarize(rawText, mode);
  const ctx = [
    companySize && `Size:${companySize}`,
    industry && `Industry:${industry}`,
    constraints && `Constraints:${constraints}`,
    extraContext && `Notes:${extraContext}`,
  ].filter(Boolean).join("|");
  const userMessage = `Org:${orgName || "Unknown"} File:${fileName}${ctx ? ` ${ctx}` : ""}\n${dataSummary}`;

  const enc = new TextEncoder();
  const systemPrompt = mode === "advanced" ? SYSTEM_ADVANCED : SYSTEM_BASIC;
  const maxTokens = mode === "advanced" ? 1500 : 600;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: maxTokens,
          system: [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }],
          messages: [{ role: "user", content: userMessage }],
        });

        const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
        const resultJson = extractJson(text);
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
        console.error("Stream error:", err);
        controller.enqueue(enc.encode("\n__STREAM_ERROR__"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
