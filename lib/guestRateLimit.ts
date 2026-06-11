import { createHash } from "crypto";
import { createAdminClient } from "./supabase-admin";

const GUEST_DAILY_LIMIT = 5;

// Per-IP daily limit for the unauthenticated /try endpoints, backed by the
// guest_usage table (service-role only). Fails open so a DB hiccup never
// blocks a live demo; the worst case is one unmetered request.
export async function checkGuestRateLimit(req: Request): Promise<{ allowed: boolean; message?: string }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  try {
    const supabase = createAdminClient();
    const { data: count, error } = await supabase.rpc("increment_guest_usage", { p_ip_hash: ipHash });
    if (error) {
      console.error("Guest rate limit check failed:", error);
      return { allowed: true };
    }
    if (typeof count === "number" && count > GUEST_DAILY_LIMIT) {
      return {
        allowed: false,
        message: `Free trial limit reached (${GUEST_DAILY_LIMIT} analyses per day). Create a free account to keep going.`,
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error("Guest rate limit error:", err);
    return { allowed: true };
  }
}
