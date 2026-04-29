-- OTP propio para acceso a Entradas sin depender de /auth/v1/otp

create table if not exists public.entrada_auth_email_otp (
  id bigserial primary key,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts smallint not null default 0,
  requested_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_entrada_auth_email_otp_email_created
  on public.entrada_auth_email_otp (email, created_at desc);

create index if not exists idx_entrada_auth_email_otp_active
  on public.entrada_auth_email_otp (email, expires_at)
  where consumed_at is null;

create table if not exists public.entrada_auth_email_user (
  email text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entrada_auth_email_user_user_id
  on public.entrada_auth_email_user (user_id);

create or replace function public.entrada_auth_email_user_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_entrada_auth_email_user_updated_at on public.entrada_auth_email_user;
create trigger trg_entrada_auth_email_user_updated_at
before update on public.entrada_auth_email_user
for each row
execute function public.entrada_auth_email_user_touch_updated_at();

insert into public.entrada_auth_email_user (email, user_id)
select lower(trim(eu.email)) as email, eu.id as user_id
from public.entrada_usuario eu
where eu.email is not null
  and trim(eu.email) <> ''
on conflict (email) do update
set user_id = excluded.user_id;

alter table public.entrada_auth_email_otp enable row level security;
alter table public.entrada_auth_email_user enable row level security;

drop policy if exists "entrada auth email otp deny all" on public.entrada_auth_email_otp;
create policy "entrada auth email otp deny all"
on public.entrada_auth_email_otp
for all
to authenticated, anon
using (false)
with check (false);

drop policy if exists "entrada auth email user deny all" on public.entrada_auth_email_user;
create policy "entrada auth email user deny all"
on public.entrada_auth_email_user
for all
to authenticated, anon
using (false)
with check (false);
