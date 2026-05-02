import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  const { id: profileId, uploadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify profile ownership
  const { data: profile } = await supabase
    .from("company_profiles")
    .select("id")
    .eq("id", profileId)
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete metrics for this upload first (cascade should handle it, but be explicit)
  await supabase.from("profile_metrics").delete().eq("upload_id", uploadId);

  const { error } = await supabase
    .from("profile_uploads")
    .delete()
    .eq("id", uploadId)
    .eq("profile_id", profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
