import { createClient } from '@supabase/supabase-js';

// Server-only client — uses the service-role key, which bypasses RLS.
// Import this ONLY from server actions / API routes, never from a
// 'use client' component. This is where token validation for red/blue
// links and all writes (scores, incidents, WAF toggles, minting) live.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
