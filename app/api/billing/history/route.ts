import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: history } = await admin
    .from("subscription_history")
    .select("id, plan, status, from_plan, to_plan, is_admin_action, note, started_at, ended_at, changed_by_user_id")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  const adminIds = [...new Set((history ?? []).filter((h: { changed_by_user_id?: string }) => h.changed_by_user_id).map((h: { changed_by_user_id: string }) => h.changed_by_user_id))];
  const adminEmailMap: Record<string, string> = {};
  if (adminIds.length > 0) {
    for (const id of adminIds) {
      const { data: au } = await admin.auth.admin.getUserById(id as string);
      if (au?.user?.email) adminEmailMap[id as string] = au.user.email;
    }
  }

  const enriched = (history ?? []).map((h: {
    id: string; plan: string; status: string; from_plan?: string; to_plan?: string;
    is_admin_action?: boolean; note?: string; started_at?: string; ended_at?: string; changed_by_user_id?: string;
  }) => ({
    ...h,
    admin_email: h.changed_by_user_id ? (adminEmailMap[h.changed_by_user_id] ?? "Admin") : null,
  }));

  return NextResponse.json({ history: enriched });
}
