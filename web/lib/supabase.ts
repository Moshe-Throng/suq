import { createClient } from "@supabase/supabase-js";

// Server-side client (service role — for API routes)
export function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}
