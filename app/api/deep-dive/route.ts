import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";
import { deduplicateCSV } from "@/lib/deduplicateCSV";
import Papa from "papaparse";

export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM_BASIC = `You are a senior financial consultant conducting a focused single-variable deep-dive for a client. Write in first-person plural ("We found...", "We see...", "We recommend..."). Be specific and direct - cite exact numbers from the data. Do not fabricate benchmarks, named organizations, or invent data. Do not use em-dashes.

First, identify the exact column in the data whose name matches or closely matches the user-specified metric. Read its actual values directly from the provided rows. Do not infer or proxy from other columns.

Structure your response with exactly these three section headers, each on its own line preceded by ##:

## WHAT WE SEE
Describe the current state and trend of the metric using specific numbers from the exact column. 2-3 sentences.

## WHAT'S DRIVING IT
Identify 1-2 key factors visible in the data that explain this trend. Cross-reference other columns where relevant. 2-3 sentences.

## WHAT WE'D DO
Provide exactly 3 specific numbered action steps. Each step must be concrete and actionable for this specific organization.

Output plain text only. No markdown code blocks, no bullet points. Use numbered lists only in the action steps section.`;

const SYSTEM_ADVANCED = `You are a senior financial consultant conducting a focused single-variable deep-dive for a client. Write in first-person plural ("We found...", "We see...", "We recommend..."). Be specific, direct, and free of hedging. Do not fabricate named real-world organizations or case studies. Do not use em-dashes.

First, identify the exact column in the data whose name matches or closely matches the user-specified metric. Read its actual values directly from the provided rows and computed statistics. Do not infer or proxy from other columns.

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

function summarizeBasic(rawText: string): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";
  const headers = lines[0].split(",").slice(0, 12).join(",");
  const rows = lines.slice(1, 21).map(r => r.split(",").slice(0, 12).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample (first 20 rows):\n${rows}`.slice(0, 1500);
}

function summarizeAdvanced(rawText: string): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";

  const parseRow = (line: string) => line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const headers = parseRow(lines[0]);
  const dataRows = lines.slice(1).map(parseRow);

  const toNum = (v: string) => Number(v.replace(/[,$% ]/g, ""));
  const colStats: string[] = [];

  for (let c = 0; c < Math.min(headers.length, 20); c++) {
    const vals = dataRows.map(r => r[c] ?? "").filter(v => v !== "");
    const numVals = vals.map(toNum).filter(n => !isNaN(n) && isFinite(n));
    if (numVals.length > vals.length * 0.5 && numVals.length > 1) {
      const min = Math.min(...numVals);
      const max = Math.max(...numVals);
      const avg = Math.round((numVals.reduce((a, b) => a + b, 0) / numVals.length) * 100) / 100;
      const trend = numVals[numVals.length - 1] > numVals[0] * 1.05 ? "up"
        : numVals[numVals.length - 1] < numVals[0] * 0.95 ? "down" : "flat";
      colStats.push(`${headers[c]}: min=${min}, max=${max}, avg=${avg}, trend=${trend}`);
    }
  }

  const headerLine = lines[0].split(",").slice(0, 12).join(",");
  const rowsSample = lines.slice(1, 51).map(r => r.split(",").slice(0, 12).join(",")).join("\n");
  const statsSection = colStats.length > 0 ? `\n\nComputed column statistics:\n${colStats.join("\n")}` : "";

  return `Rows: ${dataRows.length}, Cols: ${headers.length}\nHeaders: ${headerLine}\nSample (first 50 rows):\n${rowsSample}${statsSection}`.slice(0, 3000);
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
  let rawText: string, fileName: string, orgName: string, metric: string,
    industry: string, constraints: string, mode: string;

  let profileId = "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
    metric = (fd.get("metric") as string) ?? "";
    industry = (fd.get("industry") as string) ?? "";
    constraints = (fd.get("constraints") as string) ?? "";
    mode = (fd.get("mode") as string) ?? "basic";
    profileId = (fd.get("profileId") as string) ?? "";
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
    metric = body.metric ?? "";
    industry = body.industry ?? "";
    constraints = body.constraints ?? "";
    mode = body.mode ?? "basic";
    profileId = body.profileId ?? "";
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
        const lines = ["Historical trend data for this organization:"];
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
  } catch { /* non-fatal */ }

  const summary = mode === "advanced" ? summarizeAdvanced(rawText) : summarizeBasic(rawText);
  const contextLines = [
    industry && `Organization type/sector: ${industry}`,
    constraints && `Key constraints: ${constraints}`,
    historicalContext && historicalContext,
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
          max_tokens: mode === "advanced" ? 1200 : 600,
          system: mode === "advanced" ? SYSTEM_ADVANCED : SYSTEM_BASIC,
          messages: [{ role: "user", content: userMessage }],
        });

        const text = msg.content[0].type === "text" ? msg.content[0].text : "";
        controller.enqueue(enc.encode(text + `\n__DEDUP__:${JSON.stringify(dedupStats)}`));

        try {
          if (usage) {
            await supabase.from("daily_usage")
              .update(mode === "basic"
                ? { basic_count: basicUsed + 1 }
                : { advanced_count: advancedUsed + 1 })
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
