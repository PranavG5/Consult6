import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Current user's organization membership (RLS scopes the reads)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, joined_at, organizations(id, name, university, plan)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ org: null });

  const orgRaw = membership.organizations as unknown;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  return NextResponse.json({
    org,
    role: membership.role,
    joined_at: membership.joined_at,
  });
}
