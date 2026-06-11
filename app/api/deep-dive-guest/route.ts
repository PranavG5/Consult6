import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { deduplicateCSV } from "@/lib/deduplicateCSV";
import { checkGuestRateLimit } from "@/lib/guestRateLimit";
import Papa from "papaparse";

export const maxDuration = 60;

const MAX_GUEST_BYTES = 2 * 1024 * 1024;

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

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  let rawText: string, fileName: string, orgName: string, metric: string;

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
    metric = (fd.get("metric") as string) ?? "";
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
    metric = body.metric ?? "";
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
  if (rawText.length > MAX_GUEST_BYTES) {
    return new Response(JSON.stringify({ error: "File too large for the guest trial (2MB max). Create a free account for larger files." }), {
      status: 413, headers: { "Content-Type": "application/json" },
    });
  }
  orgName = orgName.slice(0, 200);
  metric = metric.slice(0, 200);

  const rateLimit = await checkGuestRateLimit(req);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: rateLimit.message }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
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

  const summary = summarize(rawText);
  const userMessage = `Organization: ${orgName || "Unknown"}
File: ${fileName}
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
        controller.enqueue(enc.encode(text + `\n__DEDUP__:${JSON.stringify(dedupStats)}`));
      } catch (err) {
        const is429 = (err as { status?: number })?.status === 429;
        const errMsg = is429
          ? "Rate limit reached. Please wait a minute and try again."
          : err instanceof Error ? err.message : String(err);
        console.error("Guest deep-dive error:", errMsg);
        controller.enqueue(enc.encode(`\n__STREAM_ERROR__:${errMsg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
