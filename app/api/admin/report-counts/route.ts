import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .single();
    if (profile?.account_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("analysis_history")
      .select("user_id, mode");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by user_id and mode
    const countMap: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
      if (!countMap[row.user_id]) countMap[row.user_id] = {};
      countMap[row.user_id][row.mode] = (countMap[row.user_id][row.mode] ?? 0) + 1;
    }

    const counts: { user_id: string; mode: string; count: number }[] = [];
    for (const [user_id, modes] of Object.entries(countMap)) {
      for (const [mode, count] of Object.entries(modes)) {
        counts.push({ user_id, mode, count });
      }
    }

    return NextResponse.json({ counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
