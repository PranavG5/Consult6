import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM_DEEP_DIVE = `You are a senior financial consultant conducting a focused single-variable deep-dive for a client. Write in first-person plural ("We found...", "We see...", "We recommend..."). Be specific, direct, and free of hedging. Do not fabricate named real-world organizations or case studies. Do not use em-dashes.

Structure your response with exactly these four section headers, each on its own line preceded by ##:

## WHAT WE SEE
Describe the current state and trend of the metric. Include specific numbers from the data. 2-4 sentences.

## WHAT'S DRIVING IT
Identify the key factors from the data that explain this trend. Relate to other variables in the spreadsheet where relevant. 2-4 sentences.

## HOW YOU COMPARE
Compare to relevant sector benchmarks for this type of organization. If a specific benchmark is not available, describe what is typical for this org type. 2-3 sentences.

## WHAT WE'D DO
Provide 3-5 specific numbered action steps. Each step should be concrete and actionable for this specific organization.

Output plain text only. No markdown code blocks, no bullet points. Use numbered lists only in the action steps section.`;

function summarize(rawText: string): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";
  const headers = lines[0].split(",").slice(0, 12).join(",");
  const rows = lines.slice(1, 10).map(r => r.split(",").slice(0, 12).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample:\n${rows}`.slice(0, 1200);
}

const LIMITS = {
  free: { basic: 3, advanced: 1 },
  paid: { basic: 10, advanced: 3 },
  enterprise: { basic: 50, advanced: 20 },
  admin: { basic: 999999, advanced: 999999 },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in to use Deep-Dive analysis." }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const ct = req.headers.get("content-type") ?? "";
  let rawText: string, fileName: string, orgName: string, metric: string, industry: string, constraints: string;

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
    metric = (fd.get("metric") as string) ?? "";
    industry = (fd.get("industry") as string) ?? "";
    constraints = (fd.get("constraints") as string) ?? "";
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
    metric = body.metric ?? "";
    industry = body.industry ?? "";
    constraints = body.constraints ?? "";
  }

  if (!rawText) {
    return new Response(JSON.stringify({ error: "No financial data provided." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!metric.trim()) {
    return new Response(JSON.stringify({ error: "Please specify a metric to focus on." }), {
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

  if (basicUsed >= limits.basic) {
    return new Response(JSON.stringify({ error: `Daily analysis limit reached (${limits.basic}/day).` }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }

  const summary = summarize(rawText);
  const contextLines = [
    industry && `Organization type/sector: ${industry}`,
    constraints && `Key constraints: ${constraints}`,
  ].filter(Boolean).join("\n");

  const userMessage = `Organization: ${orgName || "Unknown"}
File: ${fileName}${contextLines ? `\n${contextLines}` : ""}
Metric to analyze: ${metric}

Data:
${summary}`;

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system: SYSTEM_DEEP_DIVE,
          messages: [{ role: "user", content: userMessage }],
        });

        const text = msg.content[0].type === "text" ? msg.content[0].text : "";
        controller.enqueue(enc.encode(text));

        try {
          if (usage) {
            await supabase.from("daily_usage")
              .update({ basic_count: basicUsed + 1 })
              .eq("id", usage.id);
          } else {
            await supabase.from("daily_usage").insert({
              user_id: user.id,
              date: today,
              basic_count: 1,
              advanced_count: 0,
            });
          }
        } catch (dbErr) {
          console.error("DB update error (non-fatal):", dbErr);
        }
      } catch (err) {
        const is429 = (err as { status?: number })?.status === 429;
        const errMsg = is429
          ? "Rate limit reached. Please wait a minute and try again."
          : err instanceof Error ? err.message : String(err);
        console.error("Deep-dive error:", errMsg);
        controller.enqueue(enc.encode(`\n__STREAM_ERROR__:${errMsg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
