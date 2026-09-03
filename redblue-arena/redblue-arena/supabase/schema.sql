-- RedBlue Arena schema
-- Run this in the Supabase SQL editor before policies.sql

create extension if not exists pgcrypto;

create table if not exists matches (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz default now(),
  status                  text check (status in ('pending','active','completed')) default 'pending',
  target_url              text,
  red_token               text unique not null,
  blue_token              text unique not null,
  red_score               int default 0,
  blue_score              int default 0,
  match_duration_minutes  int,
  started_at              timestamptz,
  ends_at                 timestamptz
);

create table if not exists http_logs (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid references matches(id) on delete cascade,
  timestamp        timestamptz default now(),
  method           text,
  path             text,
  request_body     text,
  status_code      int,
  flagged_by_blue  boolean default false,
  is_malicious     boolean default false,
  attack_category  text
);

create table if not exists incidents (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid references matches(id) on delete cascade,
  log_id         uuid references http_logs(id) on delete set null,
  owasp_category text,
  status         text check (status in ('correct','incorrect','pending')) default 'pending',
  points_awarded int default 0,
  submitted_at   timestamptz default now()
);

create table if not exists waf_rules (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references matches(id) on delete cascade,
  rule_key    text,
  enabled     boolean default false,
  toggled_at  timestamptz
);

create table if not exists credentials (
  id                 uuid primary key default gen_random_uuid(),
  match_id           uuid references matches(id) on delete cascade,
  candidate_address  text,
  role               text check (role in ('red','blue')),
  score              int,
  nft_tx_hash        text,
  metadata_uri       text,
  minted_at          timestamptz,
  mint_mode          text check (mint_mode in ('onchain','simulated')) default 'onchain'
);

-- Configurable scoring table so point values aren't hardcoded in app code
create table if not exists scoring_config (
  event_key  text primary key,
  points     int not null
);

insert into scoring_config (event_key, points) values
  ('exploit_detected_unblocked', 15),
  ('ctf_flag_captured', 25),
  ('incident_correct', 10),
  ('incident_false_positive', -5),
  ('waf_blocks_attack', 20),
  ('attack_lands_despite_waf', 10)
on conflict (event_key) do nothing;

create index if not exists idx_http_logs_match on http_logs(match_id);
create index if not exists idx_incidents_match on incidents(match_id);
create index if not exists idx_waf_rules_match on waf_rules(match_id);
create unique index if not exists uq_waf_rules_match_rule on waf_rules(match_id, rule_key);
create index if not exists idx_credentials_match on credentials(match_id);

alter publication supabase_realtime add table matches, http_logs, waf_rules;
