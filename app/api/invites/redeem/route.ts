import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

interface InviteRow {
  id: string;
  org_id: string;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  organizations: { id: string; name: string; plan: string } | { id: string; name: string; plan: string }[] | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to accept an invite." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "Missing invite code" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("org_invites")
    .select("id, org_id, max_uses, use_count, expires_at, revoked_at, organizations(id, name, plan)")
    .eq("code", code)
    .maybeSingle();

  const invite = data as InviteRow | null;
  const orgRaw = invite?.organizations;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  if (!invite || !org) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.revoked_at) return NextResponse.json({ error: "This invite has been revoked." }, { status: 410 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: "This invite has reached its maximum number of uses." }, { status: 410 });
  }

  // Already in an org? Joining is idempotent for the same org, blocked for another.
  const { data: existing } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.org_id === invite.org_id) {
      return NextResponse.json({ ok: true, orgName: org.name, alreadyMember: true });
    }
    return NextResponse.json(
      { error: "Your account already belongs to another organization. Contact support to switch." },
      { status: 409 }
    );
  }

  // First member becomes the owner (typically the treasurer at the pitch)
  const { count } = await admin
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", invite.org_id);

  const { error: memberErr } = await admin.from("org_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: (count ?? 0) === 0 ? "owner" : "member",
    invite_id: invite.id,
  });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  await admin.from("org_invites").update({ use_count: invite.use_count + 1 }).eq("id", invite.id);

  // Reflect the org plan on the personal account too (badge, legacy checks).
  // Admins keep their account type.
  const { data: profile } = await admin.from("profiles").select("account_type").eq("id", user.id).single();
  if (profile && profile.account_type !== "admin" && profile.account_type !== org.plan) {
    await admin.from("profiles").update({ account_type: org.plan }).eq("id", user.id);
    await admin.from("subscription_history").insert({
      user_id: user.id,
      plan: org.plan,
      status: "active",
      from_plan: profile.account_type,
      to_plan: org.plan,
      is_admin_action: false,
      note: `Joined organization "${org.name}" via invite`,
      started_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, orgName: org.name });
}
