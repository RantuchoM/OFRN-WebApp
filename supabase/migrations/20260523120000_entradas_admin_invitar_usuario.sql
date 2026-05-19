-- Pre-registro admin: conservar rol asignado al completar perfil en primer login.

create or replace function public.entrada_ensure_profile(
  p_nombre text,
  p_apellido text
)
returns public.entrada_usuario
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.entrada_usuario;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Usuario auth no encontrado';
  end if;

  v_email := lower(trim(coalesce(v_user.email, '')));

  insert into public.entrada_usuario (id, nombre, apellido, email, rol)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_nombre), ''), '—'),
    coalesce(nullif(trim(p_apellido), ''), '—'),
    v_email,
    case
      when v_email = 'ofrn.archivo@gmail.com' then 'admin'::public.entrada_rol
      else 'personal'::public.entrada_rol
    end
  )
  on conflict (id) do update
  set
    nombre = coalesce(nullif(trim(excluded.nombre), ''), nullif(trim(public.entrada_usuario.nombre), ''), '—'),
    apellido = coalesce(nullif(trim(excluded.apellido), ''), nullif(trim(public.entrada_usuario.apellido), ''), '—'),
    email = excluded.email
  returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.entrada_ensure_profile(text, text) to authenticated;
