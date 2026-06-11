import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // Only allow same-site relative redirects (password recovery uses /auth/update-password)
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login`);
    }
  }

  return NextResponse.redirect(`${origin}${target}`);
}
