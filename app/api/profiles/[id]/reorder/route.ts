import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: profileId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { orderedIds } = body as { orderedIds: string[] };
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
  }

  // Update sort_order for each upload
  await Promise.all(
    orderedIds.map((uploadId, index) =>
      supabase
        .from("profile_uploads")
        .update({ sort_order: index })
        .eq("id", uploadId)
        .eq("profile_id", profileId)
    )
  );

  return NextResponse.json({ success: true });
}
