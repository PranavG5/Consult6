import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { generateInviteCode, sanitizeCustomLimits, requireAdmin, VALID_ORG_PLANS } from "@/lib/orgAdmin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data: orgs, error: orgsErr } = await admin
    .from("organizations")
    .select("*, org_members(user_id, role, joined_at), org_invites(id, code, attribution, max_uses, use_count, expires_at, revoked_at, created_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (orgsErr) return NextResponse.json({ error: orgsErr.message }, { status: 500 });

  // Map member user ids to emails for display
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById: Record<string, string> = {};
  for (const u of usersPage?.users ?? []) emailById[u.id] = u.email ?? "";

  const enriched = (orgs ?? []).map(org => ({
    ...org,
    org_members: (org.org_members ?? []).map((m: { user_id: string; role: string; joined_at: string }) => ({
      ...m,
      email: emailById[m.user_id] ?? m.user_id,
    })),
  }));

  return NextResponse.json({ orgs: enriched });
}

export async function POST(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const name = String(body.name ?? "").trim().slice(0, 200);
  const university = String(body.university ?? "").trim().slice(0, 200);
  const plan = String(body.plan ?? "enterprise");
  const attribution = String(body.attribution ?? "").trim().slice(0, 200);
  const notes = String(body.notes ?? "").trim().slice(0, 2000);
  const maxUses = body.max_uses != null && body.max_uses !== "" ? Math.max(1, Math.floor(Number(body.max_uses))) : null;

  if (!name) return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  if (!VALID_ORG_PLANS.includes(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (maxUses !== null && !Number.isFinite(maxUses)) return NextResponse.json({ error: "Invalid max_uses" }, { status: 400 });

  const customLimits = sanitizeCustomLimits(body.custom_limits);

  const admin = createAdminClient();
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name,
      university: university || null,
      plan,
      custom_limits: customLimits,
      notes: notes || null,
      created_by: user!.id,
    })
    .select()
    .single();

  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  const { data: invite, error: invErr } = await admin
    .from("org_invites")
    .insert({
      org_id: org.id,
      code: generateInviteCode(),
      attribution: attribution || null,
      max_uses: maxUses,
      created_by: user!.id,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  return NextResponse.json({ org, invite }, { status: 201 });
}
