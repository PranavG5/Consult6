import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { generateInviteCode, requireAdmin } from "@/lib/orgAdmin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { id: orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const attribution = String(body.attribution ?? "").trim().slice(0, 200);
  const maxUses = body.max_uses != null && body.max_uses !== "" ? Math.max(1, Math.floor(Number(body.max_uses))) : null;

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { data: invite, error: invErr } = await admin
    .from("org_invites")
    .insert({
      org_id: orgId,
      code: generateInviteCode(),
      attribution: attribution || null,
      max_uses: maxUses,
      created_by: user!.id,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  return NextResponse.json({ invite }, { status: 201 });
}
