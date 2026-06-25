import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getEffectivePlan } from "@/lib/planLimits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("company_profiles")
    .select("id, name, sector, created_at, key_metrics")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = data ?? [];
  const ids = profiles.map(p => p.id);

  // Pull uploads + metrics for every profile in two queries (avoids N+1) so each
  // index card can show a live snapshot: upload count, latest value, and a spark.
  const [{ data: uploads }, { data: metrics }] = await Promise.all([
    ids.length
      ? supabase
          .from("profile_uploads")
          .select("profile_id, period_label, sort_order, uploaded_at")
          .in("profile_id", ids)
          .order("sort_order", { ascending: true })
          .order("uploaded_at", { ascending: true })
      : Promise.resolve({ data: [] as { profile_id: string; period_label: string }[] }),
    ids.length
      ? supabase
          .from("profile_metrics")
          .select("profile_id, period_label, metric_name, metric_value")
          .in("profile_id", ids)
      : Promise.resolve({ data: [] as { profile_id: string; period_label: string; metric_name: string; metric_value: number }[] }),
  ]);

  // Ordered unique periods per profile
  const periodsByProfile: Record<string, string[]> = {};
  const uploadCount: Record<string, number> = {};
  for (const u of (uploads ?? []) as { profile_id: string; period_label: string }[]) {
    uploadCount[u.profile_id] = (uploadCount[u.profile_id] ?? 0) + 1;
    const arr = (periodsByProfile[u.profile_id] ??= []);
    if (!arr.includes(u.period_label)) arr.push(u.period_label);
  }

  // metric_name -> period -> value, per profile
  const valuesByProfile: Record<string, Record<string, Record<string, number>>> = {};
  for (const m of (metrics ?? []) as { profile_id: string; period_label: string; metric_name: string; metric_value: number }[]) {
    const byMetric = (valuesByProfile[m.profile_id] ??= {});
    const byPeriod = (byMetric[m.metric_name] ??= {});
    byPeriod[m.period_label] = Number(m.metric_value);
  }

  const profilesWithSnapshot = profiles.map(p => {
    const periods = periodsByProfile[p.id] ?? [];
    const byMetric = valuesByProfile[p.id] ?? {};
    const metricNames = Object.keys(byMetric);
    const pinned: string[] = Array.isArray(p.key_metrics) ? p.key_metrics : [];
    // Featured metric = first pinned KPI that has data, else first tracked metric.
    const primaryName = pinned.find(m => byMetric[m]) ?? metricNames[0] ?? null;
    let spark: (number | null)[] = [];
    let latest: number | null = null;
    if (primaryName) {
      spark = periods.map(per => byMetric[primaryName][per] ?? null);
      const populated = spark.filter((v): v is number => v !== null);
      latest = populated.length ? populated[populated.length - 1] : null;
    }
    return {
      ...p,
      upload_count: uploadCount[p.id] ?? 0,
      metric_count: metricNames.length,
      latest_period: periods.length ? periods[periods.length - 1] : null,
      primary_metric: primaryName,
      primary_latest: latest,
      spark,
    };
  });

  return NextResponse.json({ profiles: profilesWithSnapshot });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await getEffectivePlan(supabase, user.id);
  const limit = plan.profileLimit;

  const { count } = await supabase
    .from("company_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Profile limit reached (${limit} for your plan). Upgrade to create more.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { name, sector } = body;
  if (!name?.trim() || !sector?.trim()) {
    return NextResponse.json({ error: "Name and sector are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_profiles")
    .insert({ user_id: user.id, name: name.trim(), sector: sector.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 201 });
}
