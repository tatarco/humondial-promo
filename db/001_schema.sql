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
  created_at  timestamptz not null default now()
);

create index if not exists idx_session_token on promo_sessions(token_hash);

create table if not exists promo_otp_audit (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  action     text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_phone_time on promo_otp_audit(phone, created_at desc);
