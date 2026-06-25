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
}

// Resolves the limits that apply to a user based on their personal
// account_type. Works with the user-scoped client.
export async function getEffectivePlan(supabase: SupabaseClient, userId: string): Promise<EffectivePlan> {
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", userId).single();

  let accountType = (profile?.account_type ?? "free") as PlanKey;
  if (!(accountType in DAILY_LIMITS)) accountType = "free";

  return {
    accountType,
    daily: DAILY_LIMITS[accountType],
    profileLimit: PROFILE_LIMITS[accountType],
    historyLimit: HISTORY_LIMITS[accountType],
  };
}
