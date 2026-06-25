import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { getEffectivePlan } from "@/lib/planLimits";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const [plan, { data: usage }] = await Promise.all([
    getEffectivePlan(supabase, user.id),
    supabase.from("daily_usage").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
  ]);

  return NextResponse.json({
    accountType: plan.accountType,
    basicUsed: usage?.basic_count ?? 0,
    advancedUsed: usage?.advanced_count ?? 0,
    basicLimit: plan.daily.basic,
    advancedLimit: plan.daily.advanced,
  });
}
