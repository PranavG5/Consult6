import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { sanitizeCustomLimits, requireAdmin, VALID_ORG_PLANS } from "@/lib/orgAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 200);
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updates.name = name;
  }
  if (body.university !== undefined) updates.university = String(body.university).trim().slice(0, 200) || null;
  if (body.notes !== undefined) updates.notes = String(body.notes).trim().slice(0, 2000) || null;
  if (body.plan !== undefined) {
    if (!VALID_ORG_PLANS.includes(body.plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    updates.plan = body.plan;
  }
  if (body.custom_limits !== undefined) updates.custom_limits = sanitizeCustomLimits(body.custom_limits);

  if (!Object.keys(updates).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const admin = createAdminClient();
  const { data: org, error: updErr } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ org });
}
