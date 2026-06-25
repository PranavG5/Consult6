import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const anthropic = new Anthropic();

// Returns the cached insight (if any) without spending a model call.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("latest_insight, latest_insight_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ insight: profile.latest_insight ?? null, generatedAt: profile.latest_insight_at ?? null });
}

// Generates a fresh "what changed" insight from the profile's time-series metrics
// and caches it on the profile so the dashboard can show it instantly next load.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, name, sector")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rebuild the ordered series exactly as the dashboard sees them.
  const { data: uploads } = await supabase
    .from("profile_uploads")
    .select("period_label, sort_order")
    .eq("profile_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const seen = new Set<string>();
  const periods: string[] = [];
  for (const u of uploads ?? []) {
    if (!seen.has(u.period_label)) { seen.add(u.period_label); periods.push(u.period_label); }
  }

  const { data: metrics } = await supabase
    .from("profile_metrics")
    .select("period_label, metric_name, metric_value")
    .eq("profile_id", id);

  if (!metrics?.length || periods.length < 2) {
    return NextResponse.json(
      { error: "Add at least two periods of data to generate an insight." },
      { status: 400 }
    );
  }

  const seriesMap: Record<string, Record<string, number>> = {};
  for (const row of metrics) {
    if (!seriesMap[row.metric_name]) seriesMap[row.metric_name] = {};
    seriesMap[row.metric_name][row.period_label] = Number(row.metric_value);
  }

  const lines: string[] = [];
  for (const [name, values] of Object.entries(seriesMap)) {
    lines.push(`${name}: ${periods.map(p => `${p}=${values[p] ?? "N/A"}`).join(", ")}`);
  }

  const userMessage = `Organization: ${profile.name} (${profile.sector})
Periods in chronological order: ${periods.join(" → ")}

Tracked metrics across those periods:
${lines.join("\n")}

Write a tight financial readout of what changed across these periods. 2-3 sentences, plain English, first-person plural ("we see", "we'd watch"). Name the specific metrics and the direction/magnitude of their movement. Call out the single most important trend first. Do not invent metrics that are not listed. Do not use raw underscore field names — translate to plain English. No preamble, no markdown, no headings.`;

  let insight = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 0,
      system: "You are a senior financial analyst writing a crisp dashboard insight. Return only the insight text.",
      messages: [{ role: "user", content: userMessage }],
    });
    insight = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
  } catch (e: unknown) {
    if ((e as { status?: number })?.status === 429) {
      return NextResponse.json({ error: "Rate limit reached. Please wait a minute and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: "Couldn't generate an insight right now. Please try again." }, { status: 502 });
  }

  if (!insight) return NextResponse.json({ error: "Couldn't generate an insight right now. Please try again." }, { status: 502 });

  const generatedAt = new Date().toISOString();
  await supabase
    .from("company_profiles")
    .update({ latest_insight: insight, latest_insight_at: generatedAt })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ insight, generatedAt });
}
