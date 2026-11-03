-- Verificación de mail diferida en Entradas.
-- Todos los perfiles existentes quedan verificados; solo mails nuevos (post-migración) nacen sin tilde.

alter table public.entrada_usuario
  add column if not exists email_verified_at timestamptz;

comment on column public.entrada_usuario.email_verified_at is
  'Cuando el usuario demostró posesión del mail (OTP, enlace o login con contraseña/SSO). Null = pendiente de verificar. Los perfiles anteriores a esta migración se backfillearon como verificados.';

-- Backfill: todos los mails actuales ya están verificados (solo aplica a filas existentes al correr la migración).
update public.entrada_usuario
set email_verified_at = coalesce(password_set_at, created_at, now())
where email_verified_at is null;

create or replace function public.entrada_mark_email_verified()
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
  set email_verified_at = coalesce(email_verified_at, now()),
      updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Perfil no encontrado';
  end if;

  return v_profile;
end;
$$;

comment on function public.entrada_mark_email_verified() is
  'Marca el mail del usuario autenticado como verificado (no pisa un timestamp previo).';

grant execute on function public.entrada_mark_email_verified() to authenticated;
