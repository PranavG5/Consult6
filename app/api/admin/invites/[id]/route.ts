import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/orgAdmin";

// Revoke an invite code (e.g. a leaked QR or a marketer who left)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("org_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
