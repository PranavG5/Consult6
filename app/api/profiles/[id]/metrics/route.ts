import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify profile ownership
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, name")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: metrics, error } = await supabase
    .from("profile_metrics")
    .select("period_label, metric_name, metric_value")
    .eq("profile_id", profileId)
    .order("period_label", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by metric name to get series data
  const seriesMap: Record<string, Record<string, number>> = {};
  const periodsSet = new Set<string>();

  for (const row of metrics ?? []) {
    if (!seriesMap[row.metric_name]) seriesMap[row.metric_name] = {};
    seriesMap[row.metric_name][row.period_label] = Number(row.metric_value);
    periodsSet.add(row.period_label);
  }

  const periods = Array.from(periodsSet).sort();
  const series = Object.entries(seriesMap).map(([name, values]) => ({
    name,
    values: periods.map(p => values[p] ?? null),
  }));

  // Generate historical context summary for use in analysis
  const contextLines: string[] = [`Historical data for ${profile.name}:`];
  for (const [metricName, periodValues] of Object.entries(seriesMap)) {
    const entries = periods.map(p => `${p}: ${periodValues[p] ?? "N/A"}`).join(", ");
    contextLines.push(`  ${metricName} - ${entries}`);
  }
  const historicalContext = contextLines.join("\n");

  return NextResponse.json({ periods, series, historicalContext });
}
