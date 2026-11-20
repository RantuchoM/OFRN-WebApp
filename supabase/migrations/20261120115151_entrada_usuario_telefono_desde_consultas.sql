-- Teléfono de consultas de ayuda, guardado en la cuenta para el WhatsApp de staff.
-- No entra en el perfil público: el cliente no lo selecciona y authenticated no puede leerlo.

alter table public.entrada_usuario
  add column if not exists telefono text;

comment on column public.entrada_usuario.telefono is
  'Último teléfono no vacío de entrada_ayuda_consulta para este mail. Uso interno de staff (WhatsApp).';

revoke select (telefono), update (telefono) on public.entrada_usuario from public;
revoke select (telefono), update (telefono) on public.entrada_usuario from anon, authenticated;
grant select (telefono), insert (telefono), update (telefono) on public.entrada_usuario to service_role;

create or replace function public.entrada_ultimo_telefono_consulta(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(c.telefono), '')
  from public.entrada_ayuda_consulta c
  where public.entrada_normalizar_email(c.email) = public.entrada_normalizar_email(p_email)
    and nullif(trim(c.telefono), '') is not null
  order by c.created_at desc
  limit 1;
$$;

create or replace function public.entrada_sync_telefono_usuario(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.entrada_normalizar_email(p_email);
  v_tel text;
begin
  if v_email is null then
    return;
  end if;
  v_tel := public.entrada_ultimo_telefono_consulta(v_email);
  if v_tel is null then
    return;
  end if;
  update public.entrada_usuario
  set telefono = v_tel
  where public.entrada_normalizar_email(email) = v_email
    and telefono is distinct from v_tel;
end;
$$;

create or replace function public.entrada_usuario_tomar_telefono_consulta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.telefono), '') is null then
    new.telefono := public.entrada_ultimo_telefono_consulta(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists entrada_usuario_bi_telefono_consulta on public.entrada_usuario;
create trigger entrada_usuario_bi_telefono_consulta
  before insert on public.entrada_usuario
  for each row
  execute function public.entrada_usuario_tomar_telefono_consulta();

create or replace function public.entrada_ayuda_consulta_sync_telefono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.telefono), '') is not null then
    perform public.entrada_sync_telefono_usuario(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists entrada_ayuda_consulta_aiu_sync_telefono on public.entrada_ayuda_consulta;
create trigger entrada_ayuda_consulta_aiu_sync_telefono
  after insert or update of email, telefono on public.entrada_ayuda_consulta
  for each row
  execute function public.entrada_ayuda_consulta_sync_telefono();

-- Barrido: el teléfono más reciente de cada mail que ya tiene cuenta.
update public.entrada_usuario u
set telefono = src.telefono
from (
  select distinct on (public.entrada_normalizar_email(c.email))
    public.entrada_normalizar_email(c.email) as email,
    nullif(trim(c.telefono), '') as telefono
  from public.entrada_ayuda_consulta c
  where nullif(trim(c.telefono), '') is not null
    and public.entrada_normalizar_email(c.email) is not null
  order by public.entrada_normalizar_email(c.email), c.created_at desc
) src
where public.entrada_normalizar_email(u.email) = src.email
  and src.telefono is not null
  and u.telefono is distinct from src.telefono;

create or replace function public.entrada_staff_telefonos_por_emails(p_emails text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_emails text[];
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
  end if;

  select coalesce(array_agg(n.e), array[]::text[])
  into v_emails
  from (
    select distinct public.entrada_normalizar_email(x) as e
    from unnest(coalesce(p_emails, array[]::text[])) as x
    where public.entrada_normalizar_email(x) is not null
    limit 200
  ) n;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object('email', q.email, 'telefono', q.telefono)
      order by q.email
    )
    from (
      select
        e.email,
        coalesce(
          (
            select nullif(trim(u.telefono), '')
            from public.entrada_usuario u
            where public.entrada_normalizar_email(u.email) = e.email
            limit 1
          ),
          public.entrada_ultimo_telefono_consulta(e.email)
        ) as telefono
      from unnest(v_emails) as e(email)
    ) q
    where q.telefono is not null
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.entrada_ultimo_telefono_consulta(text) from public;
revoke all on function public.entrada_sync_telefono_usuario(text) from public;
revoke all on function public.entrada_usuario_tomar_telefono_consulta() from public;
revoke all on function public.entrada_ayuda_consulta_sync_telefono() from public;
revoke all on function public.entrada_staff_telefonos_por_emails(text[]) from public;

grant execute on function public.entrada_usuario_tomar_telefono_consulta() to service_role;
grant execute on function public.entrada_ayuda_consulta_sync_telefono() to service_role;
grant execute on function public.entrada_staff_telefonos_por_emails(text[]) to authenticated;
