import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const PROFILE_LIMITS: Record<string, number> = {
  free: 1,
  paid: 5,
  enterprise: 20,
  admin: 999999,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("company_profiles")
    .select("id, name, sector, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with upload count
  const profilesWithCounts = await Promise.all((data ?? []).map(async (p) => {
    const { count } = await supabase
      .from("profile_uploads")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", p.id);
    return { ...p, upload_count: count ?? 0 };
  }));

  return NextResponse.json({ profiles: profilesWithCounts });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  const accountType = (profile?.account_type ?? "free") as string;
  const limit = PROFILE_LIMITS[accountType] ?? 1;

  const { count } = await supabase
    .from("company_profiles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Profile limit reached (${limit} for your plan). Upgrade to create more.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { name, sector } = body;
  if (!name?.trim() || !sector?.trim()) {
    return NextResponse.json({ error: "Name and sector are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_profiles")
    .insert({ user_id: user.id, name: name.trim(), sector: sector.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data }, { status: 201 });
}
