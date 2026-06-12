import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanKey = "free" | "paid" | "enterprise" | "admin";

export const DAILY_LIMITS: Record<PlanKey, { basic: number; advanced: number }> = {
  free: { basic: 3, advanced: 1 },
  paid: { basic: 10, advanced: 3 },
  enterprise: { basic: 50, advanced: 20 },
  admin: { basic: 999999, advanced: 999999 },
};

export const PROFILE_LIMITS: Record<PlanKey, number> = {
  free: 1,
  paid: 5,
  enterprise: 20,
  admin: 999999,
};

export const HISTORY_LIMITS: Record<PlanKey, number> = {
  free: 20,
  paid: 10000,
  enterprise: 10000,
  admin: 10000,
};

export interface EffectivePlan {
  accountType: PlanKey;
  daily: { basic: number; advanced: number };
  profileLimit: number;
  historyLimit: number;
  org: { id: string; name: string } | null;
}

interface OrgRow {
  id: string;
  name: string;
  plan: string;
  custom_limits: Record<string, number> | null;
}

// Resolves the limits that actually apply to a user. Org membership wins over
// the personal account_type (orgs carry the negotiated plan plus optional
// per-org custom_limits overrides); admins keep their unlimited access.
// Works with the user-scoped client: RLS lets members read their own org.
export async function getEffectivePlan(supabase: SupabaseClient, userId: string): Promise<EffectivePlan> {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("account_type").eq("id", userId).single(),
    supabase
      .from("org_members")
      .select("org_id, organizations(id, name, plan, custom_limits)")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  let accountType = (profile?.account_type ?? "free") as PlanKey;
  if (!(accountType in DAILY_LIMITS)) accountType = "free";

  const orgRaw = membership?.organizations as unknown;
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as OrgRow | null | undefined;

  if (org && accountType !== "admin") {
    let plan = (org.plan ?? "enterprise") as PlanKey;
    if (!(plan in DAILY_LIMITS)) plan = "enterprise";
    const base = DAILY_LIMITS[plan];
    const cl = org.custom_limits ?? {};
    return {
      accountType: plan,
      daily: {
        basic: cl.basic ?? base.basic,
        advanced: cl.advanced ?? base.advanced,
      },
      profileLimit: cl.profiles ?? PROFILE_LIMITS[plan],
      historyLimit: cl.history ?? HISTORY_LIMITS[plan],
      org: { id: org.id, name: org.name },
    };
  }

  return {
    accountType,
    daily: DAILY_LIMITS[accountType],
    profileLimit: PROFILE_LIMITS[accountType],
    historyLimit: HISTORY_LIMITS[accountType],
    org: null,
  };
}
