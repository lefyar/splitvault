create table if not exists vaults (
  id uuid primary key default gen_random_uuid(),
  contract_addr text not null unique,
  creator_addr text not null,
  service_name text not null,
  merchant_addr text not null,
  merchant_id text,
  payment_method_id uuid,
  token_addr text not null,
  monthly_amount text not null,
  billing_day int not null check (billing_day between 1 and 28),
  route text not null default 'DIRECT' check (route in ('DIRECT')),
  chain_id int not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vaults
  add column if not exists merchant_id text,
  add column if not exists payment_method_id uuid;

create table if not exists vault_members (
  id uuid primary key default gen_random_uuid(),
  vault_addr text not null references vaults(contract_addr) on delete cascade,
  wallet_addr text not null,
  display_name text,
  share_percent int not null,
  share_amount text not null,
  created_at timestamptz not null default now(),
  unique(vault_addr, wallet_addr)
);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  vault_addr text not null references vaults(contract_addr) on delete cascade,
  event_type text not null,
  tx_hash text,
  amount text,
  event_timestamp timestamptz,
  created_at timestamptz not null default now()
);

alter table payment_events
  add column if not exists event_timestamp timestamptz;

create table if not exists payment_tokens (
  id uuid primary key default gen_random_uuid(),
  chain_id int not null,
  symbol text not null,
  token_addr text not null,
  decimals int not null default 18,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(chain_id, token_addr)
);

create table if not exists merchants (
  id text primary key,
  name text not null,
  description text not null,
  category text,
  icon text,
  theme_color text,
  suggested_cost numeric not null default 10,
  route text not null default 'DIRECT' check (route in ('DIRECT')),
  status text not null default 'draft' check (status in ('draft', 'verified', 'disabled')),
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table merchants
  add column if not exists theme_color text;

create table if not exists merchant_payment_methods (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references merchants(id) on delete cascade,
  chain_id int not null,
  token_symbol text not null,
  token_address text not null,
  mode text not null check (mode in ('static_wallet', 'api_invoice', 'payment_link')),
  payout_address text,
  adapter_key text,
  min_amount text,
  max_amount text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(merchant_id, chain_id, token_address, mode)
);

alter table vaults enable row level security;
alter table vault_members enable row level security;
alter table payment_events enable row level security;
alter table payment_tokens enable row level security;
alter table merchants enable row level security;
alter table merchant_payment_methods enable row level security;

drop policy if exists "vaults are readable by app users" on vaults;
create policy "vaults are readable by app users"
  on vaults for select
  using (true);

drop policy if exists "vault members are readable by app users" on vault_members;
create policy "vault members are readable by app users"
  on vault_members for select
  using (true);

drop policy if exists "payment events are readable by app users" on payment_events;
create policy "payment events are readable by app users"
  on payment_events for select
  using (true);

drop policy if exists "payment tokens are readable by app users" on payment_tokens;
create policy "payment tokens are readable by app users"
  on payment_tokens for select
  using (enabled = true);

drop policy if exists "verified merchants are readable by app users" on merchants;
create policy "verified merchants are readable by app users"
  on merchants for select
  using (status = 'verified');

drop policy if exists "merchant payment methods are readable by app users" on merchant_payment_methods;
create policy "merchant payment methods are readable by app users"
  on merchant_payment_methods for select
  using (enabled = true);

insert into payment_tokens (chain_id, symbol, token_addr, decimals, enabled)
values
  (42220, 'cUSD', '0x765DE816845861e75A25fCA122bb6898B8B1282a', 18, true),
  (42220, 'USDC', '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', 6, false),
  (11142220, 'MockcUSD', '0xBFa30e9f862776349b881875027990223bf122bD', 18, true)
on conflict (chain_id, token_addr) do nothing;

insert into merchants (id, name, description, category, icon, theme_color, suggested_cost, route, status, website_url)
values
  ('launch-test-wallet', 'Launch test wallet', 'Internal direct-payout merchant for tiny production smoke tests.', 'internal', 'TEST', '#0f766e', 1, 'DIRECT', 'verified', null),
  ('custom-direct-wallet', 'Custom direct merchant', 'Use any merchant wallet that you have independently verified.', 'custom', '0x', '#8719fc', 10, 'DIRECT', 'verified', null)
on conflict (id) do nothing;
