import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM_BASIC = `You are a senior financial analyst. Your response must be ONLY a valid JSON object — no explanation, no markdown, no preamble. Begin your response with { and end with }.

JSON structure:
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}

Field rules: summary is 1-2 sentences with at least one quantified finding. flags has 2-4 entries; each description includes a computed value and the period it covers; metric is an exact figure from the data. recommendations has 2-3 entries each citing the flag it addresses. trajectoryNote is 1 sentence with a computed rate.

Apply these standards internally when populating each field:
- Analyze every column; never skip operational KPIs like churn_rate, nps_score, avg_deal_size.
- Compute YoY growth rates and margins numerically; cite exact values; never describe a trend without a number.
- Check for cross-metric contradictions: revenue rising with churn rising → "Fragile Growth"; customer count up with avg deal size down → "Volume vs. Value Divergence"; revenue up with EBITDA margin compressing → "Profitless Growth". Flag any confirmed contradiction as CRITICAL or WARNING with specific periods.
- Every recommendation must reference a specific flag by name.`;

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

function extractJson(text: string): object {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  let rawText: string, fileName: string, orgName: string;

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    rawText = fd.get("data") as string;
    fileName = (fd.get("files") as File)?.name ?? "upload";
    orgName = (fd.get("orgName") as string) ?? "";
  } else {
    const body = await req.json();
    rawText = body.rawText ?? body.data ?? "";
    fileName = body.fileName ?? "upload";
    orgName = body.orgName ?? "";
  }

  if (!rawText) {
    return new Response(JSON.stringify({ error: "No financial data provided." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const headerRow = rawText.trim().split("\n")[0] ?? "";
  const dateRange = extractDateRange(rawText);
  const userMessage = [
    `Organization: ${orgName || "Unknown"}`,
    `File: ${fileName}`,
    "",
    `Column headers: ${headerRow}`,
    ...(dateRange ? [`Date range: ${dateRange}`] : []),
    "",
    "Full data:",
    rawText,
    "",
    "Analyze all columns including operational KPIs. Check for all cross-metric contradictions listed in your rules. Derive all scenario assumptions from computed historical rates in this data.",
  ].join("\n");

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          temperature: 0,
          system: SYSTEM_BASIC,
          messages: [{ role: "user", content: userMessage }],
        });
        const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
        controller.enqueue(enc.encode(JSON.stringify(extractJson(text))));
      } catch (err) {
        console.error("Guest stream error:", err);
        controller.enqueue(enc.encode("\n__STREAM_ERROR__"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
