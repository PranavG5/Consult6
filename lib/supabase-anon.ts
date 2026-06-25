import { createClient } from "@supabase/supabase-js";

// Plain anon client - no cookie/session handling.
// Use for public server-side reads where no user auth is needed.
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
