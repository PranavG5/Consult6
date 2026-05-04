import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

const HISTORY_LIMITS = {
  free: 20,
  paid: 10000,
  admin: 10000,
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

  const { data: rows, error } = await supabase
    .from("analysis_history")
    .select("id, created_at, org_name, file_name, mode, analysis_data")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Map analysis_data → analysis_result for the client
  const history = (rows ?? []).map(r => ({
    id: r.id,
    created_at: r.created_at,
    label: r.org_name || r.file_name || "Unnamed",
    org_name: r.org_name,
    file_name: r.file_name,
    mode: r.mode,
    analysis_result: r.analysis_data,
  }));

  return new Response(JSON.stringify({ history, accountType, limit }), {
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
  const { mode, orgName, fileName, analysisResult } = body;

  if (!mode || !analysisResult) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const { error: insertError } = await supabase.from("analysis_history").insert({
    user_id: user.id,
    org_name: orgName ?? "",
    file_name: fileName ?? "",
    mode,
    analysis_data: analysisResult,
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
    await supabase.from("analysis_history").delete().in("id", toDelete);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
