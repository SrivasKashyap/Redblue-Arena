-- RedBlue Arena RLS policies
-- Run after schema.sql.
--
-- Design note: candidates authenticate via a per-match red/blue token in
-- the URL, not Supabase Auth. That means there's no auth.uid() to key
-- RLS off of. The safe pattern used here:
--   1. ALL writes (match creation, log inserts, scoring, WAF toggles,
--      minting) go through Next.js API routes / server actions using the
--      SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely. Token
--      validation happens in that server code, not in Postgres.
--   2. The anon key (used client-side for Realtime subscriptions and
--      read-only scoreboard/log display) gets narrow, read-only SELECT
--      access on non-sensitive columns only, via views.
--   3. Token columns on `matches` are never exposed to the anon key.

alter table matches      enable row level security;
alter table http_logs    enable row level security;
alter table incidents    enable row level security;
alter table waf_rules    enable row level security;
alter table credentials  enable row level security;
alter table scoring_config enable row level security;

-- Deny-all default (no policies = no access for anon/authenticated roles).
-- Service role always bypasses RLS, so server routes are unaffected.

-- Read-only public view for the scoreboard — excludes red_token/blue_token.
create or replace view match_public as
  select id, created_at, status, red_score, blue_score,
         match_duration_minutes, started_at, ends_at
  from matches;

grant select on match_public to anon, authenticated;

-- http_logs and waf_rules contain nothing secret (payloads are attacker
-- traffic against a disposable sandbox), so allow read for Realtime feed.
-- TODO(harden): once matches are auth-gated end-to-end, scope these with
-- a security-definer function that checks the caller's token instead of
-- leaving them open to anyone with the match_id.
create policy "public read http_logs" on http_logs
  for select using (true);

create policy "public read waf_rules" on waf_rules
  for select using (true);

create policy "public read scoring_config" on scoring_config
  for select using (true);

-- incidents and credentials carry scoring/PII-adjacent data (wallet
-- addresses) — leave fully locked; frontend fetches these via server
-- routes only, never direct client queries.
