-- Acceso Entradas: enlace mágico (sin código numérico) + contraseña opcional.
-- Aplicar en el proyecto linked cuando se despliegue la edge function entradas-auth-email.

alter table public.entrada_auth_email_otp
  alter column code_hash drop not null;

alter table public.entrada_auth_email_otp
  add column if not exists purpose text not null default 'access';

alter table public.entrada_auth_email_otp
  drop constraint if exists entrada_auth_email_otp_purpose_check;

alter table public.entrada_auth_email_otp
  add constraint entrada_auth_email_otp_purpose_check
  check (purpose in ('access', 'reset'));

comment on column public.entrada_auth_email_otp.purpose is
  'access = enlace de entrada; reset = restaurar/definir contraseña. code_hash queda null si no hay OTP numérico.';

alter table public.entrada_usuario
  add column if not exists password_set_at timestamptz;

comment on column public.entrada_usuario.password_set_at is
  'Cuando el usuario definió o restauró una contraseña propia en GoTrue. Null = entra solo con enlace al mail.';

create or replace function public.entrada_mark_password_set()
returns public.entrada_usuario
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.entrada_usuario;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  update public.entrada_usuario
  set password_set_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Perfil no encontrado';
  end if;

  return v_profile;
end;
$$;

comment on function public.entrada_mark_password_set() is
  'Marca que el usuario autenticado acaba de definir o restaurar su contraseña de Entradas.';

grant execute on function public.entrada_mark_password_set() to authenticated;
