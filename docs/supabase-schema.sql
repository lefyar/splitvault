create table if not exists vaults (
  id uuid primary key default gen_random_uuid(),
  contract_addr text not null unique,
  creator_addr text not null,
  service_name text not null,
  merchant_addr text not null,
  token_addr text not null,
  monthly_amount text not null,
  billing_day int not null check (billing_day between 1 and 28),
  route text not null default 'DIRECT' check (route in ('DIRECT')),
  chain_id int not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

alter table vaults enable row level security;
alter table vault_members enable row level security;
alter table payment_events enable row level security;

create policy "vaults are readable by app users"
  on vaults for select
  using (true);

create policy "vault members are readable by app users"
  on vault_members for select
  using (true);

create policy "payment events are readable by app users"
  on payment_events for select
  using (true);

