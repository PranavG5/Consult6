import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { deduplicateCSV } from "@/lib/deduplicateCSV";
import { normalizeColumnName, fuzzyMatchColumns } from "@/lib/normalizeColumns";

function parseCSVText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

function extractNumericMetrics(headers: string[], rows: Record<string, string>[]): { metric_name: string; metric_value: number }[] {
  const toNum = (v: string) => Number(v.replace(/[,$% ]/g, ""));
  const metrics: { metric_name: string; metric_value: number }[] = [];

  for (const header of headers) {
    const vals = rows.map(r => r[header] ?? "").filter(v => v !== "");
    const numVals = vals.map(toNum).filter(n => !isNaN(n) && isFinite(n));
    if (numVals.length > vals.length * 0.5 && numVals.length > 0) {
      // Use the last (most recent) value as the representative metric value
      const lastVal = numVals[numVals.length - 1];
      metrics.push({ metric_name: header, metric_value: lastVal });
    }
  }
  return metrics;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify profile ownership
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const fd = await req.formData();
  const periodLabel = (fd.get("period_label") as string)?.trim();
  const periodType = (fd.get("period_type") as string)?.trim() as "monthly" | "quarterly" | "annual";
  const rawText = fd.get("data") as string;

  if (!periodLabel || !periodType || !rawText) {
    return NextResponse.json({ error: "period_label, period_type, and data are required." }, { status: 400 });
  }
  if (rawText.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (10MB max)." }, { status: 413 });
  }

  const validTypes = ["monthly", "quarterly", "annual"];
  if (!validTypes.includes(periodType)) {
    return NextResponse.json({ error: "period_type must be monthly, quarterly, or annual." }, { status: 400 });
  }

  const { headers: rawHeaders, rows: rawRows } = parseCSVText(rawText);

  // Deduplicate rows
  const deduped = rawHeaders.length && rawRows.length
    ? deduplicateCSV(rawRows, rawHeaders)
    : { rows: rawRows, removedExact: 0, removedNearDupe: 0, removedSummary: 0 };
  const rows = deduped.rows;

  // Fetch existing canonical metric names for this profile
  const { data: existingMetrics } = await supabase
    .from("profile_metrics")
    .select("metric_name")
    .eq("profile_id", profileId);
  const rawCanonicals = (existingMetrics ?? []).map((m: { metric_name: string }) => m.metric_name as string);
  const existingCanonicals: string[] = Array.from(new Set(rawCanonicals));

  // Build column name mapping: raw → canonical
  const columnMap = fuzzyMatchColumns(rawHeaders, existingCanonicals);

  // Build column mappings array for response (only show where raw != canonical)
  const columnMappings = rawHeaders.map(raw => ({
    raw,
    canonical: columnMap.get(raw) ?? normalizeColumnName(raw),
  })).filter(m => m.raw !== m.canonical);

  const numericMetrics = extractNumericMetrics(rawHeaders, rows);

  // Create the upload record
  const { data: upload, error: uploadErr } = await supabase
    .from("profile_uploads")
    .insert({
      profile_id: profileId,
      user_id: user.id,
      period_label: periodLabel,
      period_type: periodType,
      row_count: rows.length,
      csv_summary: rawText.slice(0, 2000),
      column_headers: rawHeaders,
    })
    .select()
    .single();

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Insert metric rows with canonical names
  if (numericMetrics.length > 0) {
    const metricsToInsert = numericMetrics.map(m => ({
      profile_id: profileId,
      upload_id: upload.id,
      period_label: periodLabel,
      metric_name: columnMap.get(m.metric_name) ?? normalizeColumnName(m.metric_name),
      metric_value: m.metric_value,
      raw_column_name: m.metric_name,
    }));

    const { error: metricsErr } = await supabase.from("profile_metrics").insert(metricsToInsert);
    if (metricsErr) console.error("Metrics insert error (non-fatal):", metricsErr);
  }

  return NextResponse.json({
    upload,
    metrics_extracted: numericMetrics.length,
    dedupStats: { removedExact: deduped.removedExact, removedNearDupe: deduped.removedNearDupe, removedSummary: deduped.removedSummary },
    columnMappings,
  }, { status: 201 });
}
