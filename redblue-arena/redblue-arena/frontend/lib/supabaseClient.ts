import { createClient } from '@supabase/supabase-js';

// Browser client — uses the anon key only. Safe to ship to the client.
// Never put SUPABASE_SERVICE_ROLE_KEY behind NEXT_PUBLIC_*.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
