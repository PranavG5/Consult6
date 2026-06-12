import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const LIMIT_KEYS = ["basic", "advanced", "profiles", "history"] as const;

export const VALID_ORG_PLANS = ["free", "paid", "enterprise"];

export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

export function sanitizeCustomLimits(input: unknown): Record<string, number> | null {
  if (!input || typeof input !== "object") return null;
  const out: Record<string, number> = {};
  for (const key of LIMIT_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    const n = Number(v);
    if (v !== undefined && v !== null && v !== "" && Number.isFinite(n) && n >= 0) {
      out[key] = Math.floor(n);
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function requireAdmin(): Promise<{ user?: { id: string }; error?: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}
