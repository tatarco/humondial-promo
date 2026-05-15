-- HUMONDIAL 2026 promo schema — run once in Supabase SQL editor

create table if not exists promo_players (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists promo_otp_codes (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references promo_players(id),
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   int not null default 0,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_player on promo_otp_codes(player_id, created_at desc);

create table if not exists promo_sessions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references promo_players(id),
  token_hash  text not null unique,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);

create index if not exists idx_session_token on promo_sessions(token_hash, expires_at);

create table if not exists promo_otp_audit (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_phone_time on promo_otp_audit(phone, created_at desc);

-- All four tables are accessed exclusively via service_role key through Base44 Deno functions.
-- The anon/authenticated roles never receive credentials — enable RLS as defense-in-depth.
alter table promo_players       enable row level security;
alter table promo_otp_codes     enable row level security;
alter table promo_sessions      enable row level security;
alter table promo_otp_audit     enable row level security;
