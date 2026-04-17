import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM_BASIC = `You are a financial analyst. Tailor all analysis specifically to the organization described. Return ONLY valid JSON matching this exact structure. No explanation, no markdown.
{"summary":"string","flags":[{"title":"string","severity":"critical|warning|info","description":"string","metric":"string"}],"recommendations":[{"title":"string","detail":"string","priority":"high|medium|low"}],"trajectoryNote":"string"}
Rules: 2-4 flags with descriptions under 30 words each, metric as a specific value or ratio. 2-3 recommendations under 30 words each that are realistic for this specific organization. Summary 1-2 sentences. trajectoryNote 1 sentence.`;

function summarize(rawText: string): string {
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (!lines.length) return "No data.";
  const headers = lines[0].split(",").slice(0, 10).join(",");
  const rows = lines.slice(1, 9).map(r => r.split(",").slice(0, 10).join(",")).join("\n");
  return `Rows: ${lines.length - 1}, Cols: ${lines[0].split(",").length}\nHeaders: ${headers}\nSample:\n${rows}`.slice(0, 900);
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

  const summary = summarize(rawText);
  const userMessage = `Organization: ${orgName || "Unknown"}\nFile: ${fileName}\n\nData:\n${summary}`;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 900,
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
