import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

const HISTORY_LIMITS = {
  free: 5,
  paid: 20,
  admin: 20,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  const accountType = (profile?.account_type ?? "free") as keyof typeof HISTORY_LIMITS;
  const limit = HISTORY_LIMITS[accountType] ?? HISTORY_LIMITS.free;

  const { data: history, error } = await supabase
    .from("analysis_history")
    .select("id, created_at, label, mode, org_name, file_name, analysis_result")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ history: history ?? [], accountType, limit }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  const accountType = (profile?.account_type ?? "free") as keyof typeof HISTORY_LIMITS;
  const limit = HISTORY_LIMITS[accountType] ?? HISTORY_LIMITS.free;

  const body = await req.json();
  const { label, mode, orgName, fileName, analysisResult } = body;

  if (!label || !mode || !analysisResult) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Insert new history entry
  const { error: insertError } = await supabase
    .from("analysis_history")
    .insert({
      user_id: user.id,
      label,
      mode,
      org_name: orgName ?? "",
      file_name: fileName ?? "",
      analysis_result: analysisResult,
    });

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Prune old entries beyond the limit
  const { data: allEntries } = await supabase
    .from("analysis_history")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (allEntries && allEntries.length > limit) {
    const toDelete = allEntries.slice(limit).map((e: { id: string }) => e.id);
    await supabase
      .from("analysis_history")
      .delete()
      .in("id", toDelete);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
