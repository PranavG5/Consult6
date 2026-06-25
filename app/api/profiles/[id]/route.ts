import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: uploads } = await supabase
    .from("profile_uploads")
    .select("id, period_label, period_type, uploaded_at, row_count, column_headers, sort_order")
    .eq("profile_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  return NextResponse.json({ profile: data, uploads: uploads ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (Array.isArray(body.key_metrics)) {
    // Persist pinned KPI names (cap to a sane number, keep them strings)
    update.key_metrics = (body.key_metrics as unknown[])
      .filter((m): m is string => typeof m === "string")
      .slice(0, 8);
  }
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 200);
  if (typeof body.sector === "string" && body.sector.trim()) update.sector = body.sector.trim().slice(0, 200);
  if (body.metric_roles && typeof body.metric_roles === "object" && !Array.isArray(body.metric_roles)) {
    // Only persist the three known roles, each pointing at a string metric name.
    const roles: Record<string, string> = {};
    for (const r of ["balance", "income", "expense"]) {
      const v = (body.metric_roles as Record<string, unknown>)[r];
      if (typeof v === "string" && v.trim()) roles[r] = v.trim().slice(0, 200);
    }
    update.metric_roles = roles;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_profiles")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("company_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
