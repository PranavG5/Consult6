import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { detectRoles, sanitizeRoles, type MetricRoles } from "@/lib/treasury";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id, name, key_metrics, metric_roles")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch uploads in user-defined sort order to determine period ordering
  const { data: uploads } = await supabase
    .from("profile_uploads")
    .select("id, period_label, period_type, sort_order")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  // Build an ordered list of unique period labels (deduped, preserving sort_order)
  const seenPeriods = new Set<string>();
  const periods: string[] = [];
  const periodTypes: Record<string, string> = {};
  for (const u of uploads ?? []) {
    if (!seenPeriods.has(u.period_label)) {
      seenPeriods.add(u.period_label);
      periods.push(u.period_label);
      periodTypes[u.period_label] = u.period_type;
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

  // Compute period-over-period deltas off the most recent two populated periods
  // so the dashboard can render KPI cards without re-deriving on the client.
  const series = Object.entries(seriesMap).map(([name, values]) => {
    const ordered = periods.map(p => values[p] ?? null);
    const populated = ordered
      .map((v, i) => ({ v, i }))
      .filter(x => x.v !== null && x.v !== undefined) as { v: number; i: number }[];
    const latest = populated.length ? populated[populated.length - 1] : null;
    const prev = populated.length > 1 ? populated[populated.length - 2] : null;
    const change = latest && prev ? latest.v - prev.v : null;
    const changePct = latest && prev && prev.v !== 0 ? (change! / Math.abs(prev.v)) * 100 : null;
    return {
      name,
      values: ordered,
      latest: latest?.v ?? null,
      latestPeriod: latest ? periods[latest.i] : null,
      previous: prev?.v ?? null,
      change,
      changePct,
    };
  });

  // Default the featured KPIs to the first few tracked metrics when the user
  // hasn't pinned any yet, so a brand-new profile still shows a real dashboard.
  const pinned: string[] = Array.isArray(profile.key_metrics) ? profile.key_metrics : [];
  const keyMetrics = pinned.filter(m => seriesMap[m]);

  // Treasurer roles: keep the user's stored mapping (validated against existing
  // metrics) and also offer an auto-detected suggestion for unset roles.
  const metricNames = Object.keys(seriesMap);
  const storedRoles = sanitizeRoles((profile.metric_roles ?? {}) as MetricRoles, metricNames);
  const suggestedRoles = detectRoles(metricNames);

  const contextLines: string[] = [`Historical data for ${profile.name}:`];
  for (const [metricName, periodValues] of Object.entries(seriesMap)) {
    const entries = periods.map(p => `${p}: ${periodValues[p] ?? "N/A"}`).join(", ");
    contextLines.push(`  ${metricName} - ${entries}`);
  }
  const historicalContext = contextLines.join("\n");

  return NextResponse.json({ periods, periodTypes, series, keyMetrics, roles: storedRoles, suggestedRoles, historicalContext });
}
