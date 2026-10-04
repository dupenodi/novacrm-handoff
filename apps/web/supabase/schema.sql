-- NovaCRM onboarding desk. Run once in the Supabase SQL editor on a fresh project.
-- Tables are prefixed because the Supabase project is shared. RLS is on with no policies,
-- so only the server's service-role key can read or write them.

-- Every inbox email the watcher has looked at, deal or not.
create table if not exists novacrm_emails (
  id           text primary key,              -- Gmail message id
  thread_id    text,
  sender       text,
  subject      text,
  body         text,
  received_at  timestamptz,
  verdict      text not null check (verdict in ('deal', 'reply', 'duplicate', 'ignored')),
  reason       text,
  deal_id      text,
  created_at   timestamptz not null default now()
);
create index if not exists novacrm_emails_created_idx on novacrm_emails (created_at desc);

-- One customer onboarding, created from a deal handoff email. Each deal is one customer:
-- `customer_key` is the normalized customer name, unique so two handoffs for the same customer
-- can't start two onboardings. The plan is whichever Rocketlane template the AE picks on the call,
-- so it's free text, not an enum.
create table if not exists novacrm_deals (
  id                       text primary key,
  status                   text not null default 'new'
                             check (status in ('new', 'intake', 'comms', 'attention', 'done')),
  attention                text,
  email_id                 text not null unique references novacrm_emails (id),
  customer_name            text,
  customer_key             text,
  contact_name             text,
  contact_email            text,
  ae_name                  text,
  ae_email                 text,
  ae_phone                 text,
  opportunity_url          text,
  plan_name                text,
  plan_quote               text,
  plan_confirmed_at        timestamptz,
  rocketlane_project_id    text,
  rocketlane_project_name  text,
  rocketlane_template_id   text,
  rocketlane_template_name text,
  project_start_date       date,
  project_due_date         date,
  slack_channel_id         text,
  slack_channel_name       text,
  slack_simulated          boolean not null default false,
  slack_welcome_at         timestamptz,
  customer_emailed_at      timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists novacrm_deals_created_idx on novacrm_deals (created_at desc);
create unique index if not exists novacrm_deals_customer_key_idx on novacrm_deals (customer_key);
create index if not exists novacrm_deals_contact_email_idx on novacrm_deals (lower(contact_email));

-- One agent run against a deal.
create table if not exists novacrm_runs (
  id           text primary key,
  deal_id      text not null references novacrm_deals (id) on delete cascade,
  agent        text not null,
  status       text not null check (status in ('running', 'done', 'attention')),
  summary      text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists novacrm_runs_deal_idx on novacrm_runs (deal_id, started_at);

-- Each tool call or note inside a run: the audit log.
create table if not exists novacrm_run_steps (
  id           text primary key,
  seq          bigint generated always as identity,
  run_id       text not null references novacrm_runs (id) on delete cascade,
  deal_id      text not null references novacrm_deals (id) on delete cascade,
  kind         text not null check (kind in ('tool', 'note')),
  tool         text,
  title        text not null,
  why          text,
  status       text not null check (status in ('running', 'done', 'failed')),
  input        jsonb,
  output       jsonb,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists novacrm_run_steps_deal_idx on novacrm_run_steps (deal_id, seq);

-- What Sarvam's webhook reported for each AE call, keyed by Sarvam's attempt id. The call step waits for its row.
create table if not exists novacrm_calls (
  id          text primary key,                   -- Sarvam attempt id
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- Small app settings, e.g. when the inbox was last checked.
create table if not exists novacrm_kv (
  key         text primary key,
  value       jsonb,
  updated_at  timestamptz not null default now()
);

alter table novacrm_emails    enable row level security;
alter table novacrm_deals     enable row level security;
alter table novacrm_runs      enable row level security;
alter table novacrm_run_steps enable row level security;
alter table novacrm_calls     enable row level security;
alter table novacrm_kv        enable row level security;
