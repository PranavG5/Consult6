import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up non-revoked share
  const { data: share } = await supabase
    .from("shared_reports")
    .select("id, analysis_id, view_count")
    .eq("share_token", token)
    .is("revoked_at", null)
    .single();

  if (!share) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch the analysis (no user_id exposed)
  const { data: analysis } = await supabase
    .from("analysis_history")
    .select("org_name, mode, created_at, analysis_data")
    .eq("id", share.analysis_id)
    .single();

  if (!analysis) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  // Increment view_count fire-and-forget
  supabase
    .from("shared_reports")
    .update({ view_count: (share.view_count ?? 0) + 1 })
    .eq("id", share.id)
    .then(() => {});

  return new Response(JSON.stringify({
    org_name: analysis.org_name,
    mode: analysis.mode,
    created_at: analysis.created_at,
    analysis_data: analysis.analysis_data,
  }), { headers: { "Content-Type": "application/json" } });
}
