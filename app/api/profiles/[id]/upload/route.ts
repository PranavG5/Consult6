import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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

  const validTypes = ["monthly", "quarterly", "annual"];
  if (!validTypes.includes(periodType)) {
    return NextResponse.json({ error: "period_type must be monthly, quarterly, or annual." }, { status: 400 });
  }

  const { headers, rows } = parseCSVText(rawText);
  const numericMetrics = extractNumericMetrics(headers, rows);

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
      column_headers: headers,
    })
    .select()
    .single();

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // Insert metric rows
  if (numericMetrics.length > 0) {
    const metricsToInsert = numericMetrics.map(m => ({
      profile_id: profileId,
      upload_id: upload.id,
      period_label: periodLabel,
      metric_name: m.metric_name,
      metric_value: m.metric_value,
    }));

    const { error: metricsErr } = await supabase.from("profile_metrics").insert(metricsToInsert);
    if (metricsErr) console.error("Metrics insert error (non-fatal):", metricsErr);
  }

  return NextResponse.json({ upload, metrics_extracted: numericMetrics.length }, { status: 201 });
}
