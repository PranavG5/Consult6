import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, name")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch uploads in user-defined sort order to determine period ordering
  const { data: uploads } = await supabase
    .from("profile_uploads")
    .select("id, period_label, sort_order")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  // Build an ordered list of unique period labels (deduped, preserving sort_order)
  const seenPeriods = new Set<string>();
  const periods: string[] = [];
  for (const u of uploads ?? []) {
    if (!seenPeriods.has(u.period_label)) {
      seenPeriods.add(u.period_label);
      periods.push(u.period_label);
    }
  }

  const { data: metrics, error } = await supabase
    .from("profile_metrics")
    .select("period_label, metric_name, metric_value")
    .eq("profile_id", profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const seriesMap: Record<string, Record<string, number>> = {};
  for (const row of metrics ?? []) {
    if (!seriesMap[row.metric_name]) seriesMap[row.metric_name] = {};
    seriesMap[row.metric_name][row.period_label] = Number(row.metric_value);
  }

  const series = Object.entries(seriesMap).map(([name, values]) => ({
    name,
    values: periods.map(p => values[p] ?? null),
  }));

  const contextLines: string[] = [`Historical data for ${profile.name}:`];
  for (const [metricName, periodValues] of Object.entries(seriesMap)) {
    const entries = periods.map(p => `${p}: ${periodValues[p] ?? "N/A"}`).join(", ");
    contextLines.push(`  ${metricName} - ${entries}`);
  }
  const historicalContext = contextLines.join("\n");

  return NextResponse.json({ periods, series, historicalContext });
}
