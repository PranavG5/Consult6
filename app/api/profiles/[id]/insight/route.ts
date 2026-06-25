import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";
import { detectRoles, sanitizeRoles, computeTreasury, type MetricRoles } from "@/lib/treasury";

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
    .select("id, name, sector, metric_roles")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Rebuild the ordered series exactly as the dashboard sees them.
  const { data: uploads } = await supabase
    .from("profile_uploads")
    .select("period_label, period_type, sort_order")
    .eq("profile_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const seen = new Set<string>();
  const periods: string[] = [];
  const periodTypes: Record<string, string> = {};
  for (const u of uploads ?? []) {
    if (!seen.has(u.period_label)) { seen.add(u.period_label); periods.push(u.period_label); periodTypes[u.period_label] = u.period_type; }
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

  // Derive the treasurer-facing numbers (balance, runway, net flow, projection)
  // so the model reasons about trajectory rather than only describing the past.
  const metricNames = Object.keys(seriesMap);
  const roles: MetricRoles = (() => {
    const stored = sanitizeRoles((profile.metric_roles ?? {}) as MetricRoles, metricNames);
    const suggested = detectRoles(metricNames);
    return { balance: stored.balance ?? suggested.balance, income: stored.income ?? suggested.income, expense: stored.expense ?? suggested.expense };
  })();
  const t = computeTreasury(periods, seriesMap, roles, periodTypes);

  const treasuryLines: string[] = [];
  if (t.balance !== null) treasuryLines.push(`Current balance (${t.balancePeriod}): ${Math.round(t.balance).toLocaleString()}${t.balanceChange !== null ? ` (change vs prior: ${t.balanceChange >= 0 ? "+" : ""}${Math.round(t.balanceChange).toLocaleString()})` : ""}`);
  if (t.avgNetFlow !== null) treasuryLines.push(`Average net cash flow per ${t.unit}: ${t.avgNetFlow >= 0 ? "+" : ""}${Math.round(t.avgNetFlow).toLocaleString()}`);
  if (t.runway !== null) treasuryLines.push(`Estimated runway at current burn: about ${t.runway} ${t.unit}${t.runway === 1 ? "" : "s"} of funds remaining`);
  if (t.projectedBalance !== null) treasuryLines.push(`Projected balance next ${t.unit} at current trend: ${Math.round(t.projectedBalance).toLocaleString()}`);

  const userMessage = `You are advising the treasurer of: ${profile.name} (${profile.sector}).
Periods in chronological order: ${periods.join(" → ")}

Tracked metrics across those periods:
${lines.join("\n")}
${treasuryLines.length ? `\nDerived treasury position:\n${treasuryLines.join("\n")}` : ""}

Write a short, forward-looking treasury readout for the club's exec board. Requirements:
- 3-4 sentences, plain English, first-person plural ("we", "we'd").
- Lead with the trajectory: where the club's money is heading (growing, stable, or being drawn down) and, if a runway figure is given, how long the funds last at the current rate.
- Then name the single biggest driver (which income or expense moved most, and by roughly how much).
- End with ONE concrete, reasonable suggestion a student treasurer could act on this term.
- Only use the numbers given. Do not invent metrics. Translate any underscore field names into plain English. No preamble, no markdown, no headings.`;

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
