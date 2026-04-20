import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const { data: profiles } = await admin.from("profiles").select("id, account_type, industry, company_size, created_at");

  const profileMap = new Map((profiles ?? []).map((p: { id: string; account_type: string; industry: string; company_size: string; created_at: string }) => [p.id, p]));

  const users = authUsers.users.map(u => {
    const p = profileMap.get(u.id) as { account_type?: string; industry?: string; company_size?: string; created_at?: string } | undefined;
    return {
      id: u.id,
      email: u.email,
      account_type: p?.account_type ?? "free",
      industry: p?.industry ?? "",
      company_size: p?.company_size ?? "",
      created_at: p?.created_at ?? u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      provider: u.app_metadata?.provider ?? "email",
    };
  });

  return NextResponse.json({ users });
}
