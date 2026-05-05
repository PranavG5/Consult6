import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { analysis_id } = await req.json();
  if (!analysis_id) return new Response(JSON.stringify({ error: "Missing analysis_id" }), { status: 400 });

  // Verify ownership
  const { data: historyRow } = await supabase
    .from("analysis_history")
    .select("id")
    .eq("id", analysis_id)
    .eq("user_id", user.id)
    .single();

  if (!historyRow) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  // Idempotent: return existing non-revoked token if present
  const { data: existing } = await supabase
    .from("shared_reports")
    .select("share_token")
    .eq("analysis_id", analysis_id)
    .is("revoked_at", null)
    .single();

  if (existing) {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://consult6.vercel.app"}/r/${existing.share_token}`;
    return new Response(JSON.stringify({ token: existing.share_token, url }), { headers: { "Content-Type": "application/json" } });
  }

  // Create new share
  const { data: created, error } = await supabase
    .from("shared_reports")
    .insert({ user_id: user.id, analysis_id })
    .select("share_token")
    .single();

  if (error || !created) return new Response(JSON.stringify({ error: "Failed to create share" }), { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://consult6.vercel.app"}/r/${created.share_token}`;
  return new Response(JSON.stringify({ token: created.share_token, url }), { headers: { "Content-Type": "application/json" } });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { analysis_id } = await req.json();
  if (!analysis_id) return new Response(JSON.stringify({ error: "Missing analysis_id" }), { status: 400 });

  const { error } = await supabase
    .from("shared_reports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("analysis_id", analysis_id)
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}
