-- PostgreSQL-compatible foundation for the permissioned compute book.
-- Store raw imports separately; only validated records enter canonical tables.

create type source_classification as enum ('public', 'permissioned_private', 'synthetic');
create type deal_status as enum ('draft', 'screening', 'diligence', 'approval_pending', 'approved', 'executing', 'active', 'paused', 'closed', 'rejected');
create type approval_status as enum ('pending', 'approved', 'rejected');

create table counterparties (
  id uuid primary key,
  legal_name text not null,
  counterparty_type text not null check (counterparty_type in ('supplier', 'buyer', 'broker', 'execution_provider')),
  credit_grade text,
  kyc_status text not null default 'unverified',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table capacity_quotes (
  id uuid primary key,
  counterparty_id uuid not null references counterparties(id),
  source_classification source_classification not null,
  source_reference text not null,
  sku text not null,
  gpu_count integer not null check (gpu_count > 0),
  region text not null,
  cluster_topology text not null,
  network_gbps numeric not null,
  sla_percent numeric not null,
  available_from date not null,
  term_months integer not null,
  usd_hr numeric not null,
  cancellation_rights text,
  confidence numeric check (confidence between 0 and 1),
  expires_at timestamptz,
  imported_at timestamptz not null default now(),
  unique (counterparty_id, source_reference)
);

create table buyer_mandates (
  id uuid primary key,
  counterparty_id uuid not null references counterparties(id),
  source_classification source_classification not null,
  source_reference text not null,
  sku text not null,
  gpu_count integer not null check (gpu_count > 0),
  regions jsonb not null,
  minimum_network_gbps numeric not null,
  required_sla_percent numeric not null,
  available_from date not null,
  term_months integer not null,
  maximum_usd_hr numeric not null,
  confidence numeric check (confidence between 0 and 1),
  expires_at timestamptz,
  imported_at timestamptz not null default now(),
  unique (counterparty_id, source_reference)
);

create table deals (
  id uuid primary key,
  capacity_quote_id uuid not null references capacity_quotes(id),
  buyer_mandate_id uuid not null references buyer_mandates(id),
  status deal_status not null default 'draft',
  compatibility_score numeric not null,
  non_fungibility_risk numeric not null,
  risk_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deal_approvals (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  approver_id uuid not null,
  approval_role text not null check (approval_role in ('risk', 'commercial', 'credit', 'operations')),
  status approval_status not null default 'pending',
  decision_note text,
  decided_at timestamptz,
  unique (deal_id, approval_role)
);

create table execution_events (
  id uuid primary key,
  deal_id uuid not null references deals(id),
  event_type text not null,
  provider_reference text,
  idempotency_key text not null unique,
  payload jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Production RLS policy should restrict every row to the applicable desk/team.
