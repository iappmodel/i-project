-- 1/23 MVP — users — identity anchor.
-- Do not store wallet balance here.
-- Do not store trust score here except maybe cached display fields later.

create table users (
  id uuid primary key default gen_random_uuid(),

  email text unique,
  phone text unique,

  display_name text,
  country text,

  status text not null default 'active'
    check (status in ('active', 'restricted', 'suspended', 'deleted')),

  verification_level text not null default 'none'
    check (verification_level in ('none', 'email', 'phone', 'kyc_basic', 'kyc_full')),

  referral_code text unique,
  referred_by_user_id uuid references users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz
);
