import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const VALID_PLANS = ["free", "paid", "enterprise", "admin"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfile } = await supabase.from("profiles").select("account_type").eq("id", user.id).single();
  if (adminProfile?.account_type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { target_user_id, new_plan, note } = body;

  if (!target_user_id || !new_plan) return NextResponse.json({ error: "Missing target_user_id or new_plan" }, { status: 400 });
  if (!VALID_PLANS.includes(new_plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const admin = createAdminClient();

  const { data: targetProfile, error: fetchErr } = await admin.from("profiles").select("account_type").eq("id", target_user_id).single();
  if (fetchErr || !targetProfile) return NextResponse.json({ error: "Target user not found" }, { status: 404 });

  const from_plan = targetProfile.account_type;

  const { error: updateErr } = await admin.from("profiles").update({ account_type: new_plan }).eq("id", target_user_id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await admin.from("subscription_history").insert({
    user_id: target_user_id,
    plan: new_plan,
    status: "active",
    from_plan,
    to_plan: new_plan,
    changed_by_user_id: user.id,
    is_admin_action: true,
    note: note ?? null,
    started_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, from_plan, to_plan: new_plan });
}
