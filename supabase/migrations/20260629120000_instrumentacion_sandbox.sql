-- Modo Sandbox de Instrumentación: escenario global único + borradores por gira

create table if not exists public.instrumentacion_sandbox (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'active',
  nombre text not null default 'Escenario activo',
  fecha_desde date,
  fecha_hasta date,
  tipo_programa text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint instrumentacion_sandbox_singleton_key_key unique (singleton_key)
);

create table if not exists public.instrumentacion_sandbox_gira (
  id uuid primary key default gen_random_uuid(),
  sandbox_id uuid not null references public.instrumentacion_sandbox (id) on delete cascade,
  id_gira bigint not null references public.programas (id) on delete cascade,
  fuentes jsonb not null default '[]'::jsonb,
  integrantes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint instrumentacion_sandbox_gira_sandbox_gira_key unique (sandbox_id, id_gira)
);

create index if not exists instrumentacion_sandbox_gira_sandbox_id_idx
  on public.instrumentacion_sandbox_gira (sandbox_id);

create index if not exists instrumentacion_sandbox_gira_id_gira_idx
  on public.instrumentacion_sandbox_gira (id_gira);

alter table public.instrumentacion_sandbox enable row level security;
alter table public.instrumentacion_sandbox_gira enable row level security;

drop policy if exists instrumentacion_sandbox_select on public.instrumentacion_sandbox;
create policy instrumentacion_sandbox_select
  on public.instrumentacion_sandbox
  for select
  to authenticated
  using (true);

drop policy if exists instrumentacion_sandbox_insert on public.instrumentacion_sandbox;
create policy instrumentacion_sandbox_insert
  on public.instrumentacion_sandbox
  for insert
  to authenticated
  with check (true);

drop policy if exists instrumentacion_sandbox_update on public.instrumentacion_sandbox;
create policy instrumentacion_sandbox_update
  on public.instrumentacion_sandbox
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists instrumentacion_sandbox_gira_select on public.instrumentacion_sandbox_gira;
create policy instrumentacion_sandbox_gira_select
  on public.instrumentacion_sandbox_gira
  for select
  to authenticated
  using (true);

drop policy if exists instrumentacion_sandbox_gira_insert on public.instrumentacion_sandbox_gira;
create policy instrumentacion_sandbox_gira_insert
  on public.instrumentacion_sandbox_gira
  for insert
  to authenticated
  with check (true);

drop policy if exists instrumentacion_sandbox_gira_update on public.instrumentacion_sandbox_gira;
create policy instrumentacion_sandbox_gira_update
  on public.instrumentacion_sandbox_gira
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists instrumentacion_sandbox_gira_delete on public.instrumentacion_sandbox_gira;
create policy instrumentacion_sandbox_gira_delete
  on public.instrumentacion_sandbox_gira
  for delete
  to authenticated
  using (true);
