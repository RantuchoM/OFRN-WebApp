-- Búsqueda de staff para reemitir entradas a quien ya tuvo una reserva.
-- Identidad = mail del beneficiario real, nunca el del emisor en reservas de terceros.

create or replace function public.entrada_fold_texto(p_text text)
returns text
language sql
immutable
as $$
  select translate(
    lower(coalesce(p_text, '')),
    'áéíóúüñàèìòùäëïöâêîôû',
    'aeiouunaeiouaeioaeiou'
  );
$$;

create or replace function public.entrada_staff_buscar_personas_con_entradas(p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text;
  v_pat text;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permisos para reservas a terceros';
  end if;

  v_q := public.entrada_fold_texto(trim(coalesce(p_q, '')));
  v_q := replace(replace(replace(v_q, '\', ''), '%', ''), '_', '');
  if char_length(v_q) < 2 then
    return '[]'::jsonb;
  end if;
  v_pat := '%' || v_q || '%';

  return coalesce((
    with base as (
      select
        case
          when r.reservada_por is null then public.entrada_normalizar_email(u.email)
          when r.usuario_id is distinct from r.reservada_por then public.entrada_normalizar_email(u.email)
          else public.entrada_normalizar_email(r.email_beneficiario)
        end as email,
        case
          when r.reservada_por is null or r.usuario_id is distinct from r.reservada_por then u.nombre
          else null
        end as nombre,
        case
          when r.reservada_por is null or r.usuario_id is distinct from r.reservada_por then u.apellido
          else null
        end as apellido,
        case
          when (r.reservada_por is null or r.usuario_id is distinct from r.reservada_por)
            and coalesce(u.activo, false)
          then true
          else false
        end as tiene_cuenta,
        case
          when r.reservada_por is not null and r.usuario_id is not distinct from r.reservada_por
          then nullif(trim(r.beneficiario_referencia), '')
          else null
        end as nota,
        r.created_at
      from public.entrada_reserva r
      left join public.entrada_usuario u on u.id = r.usuario_id
    ),
    ranked as (
      select
        b.email,
        b.nombre,
        b.apellido,
        b.tiene_cuenta,
        b.nota,
        count(*) over (partition by b.email)::int as reservas,
        string_agg(b.nota, ' ') over (partition by b.email) as notas,
        row_number() over (
          partition by b.email
          order by b.tiene_cuenta desc, (b.nombre is null), b.created_at desc
        ) as rn
      from base b
      where b.email is not null
    ),
    personas as (
      select email, nombre, apellido, tiene_cuenta, nota, notas, reservas
      from ranked
      where rn = 1
    )
    select jsonb_agg(
      jsonb_build_object(
        'email', p.email,
        'nombre', p.nombre,
        'apellido', p.apellido,
        'tiene_cuenta', p.tiene_cuenta,
        'nota', p.nota,
        'reservas', p.reservas
      )
      order by p.tiene_cuenta desc, p.reservas desc, p.apellido nulls last, p.nombre nulls last, p.email
    )
    from (
      select *
      from personas p
      where public.entrada_fold_texto(p.email) like v_pat
         or public.entrada_fold_texto(p.nombre) like v_pat
         or public.entrada_fold_texto(p.apellido) like v_pat
         or public.entrada_fold_texto(coalesce(p.apellido, '') || ' ' || coalesce(p.nombre, '')) like v_pat
         or public.entrada_fold_texto(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')) like v_pat
         or public.entrada_fold_texto(p.notas) like v_pat
      order by p.tiene_cuenta desc, p.reservas desc, p.apellido nulls last, p.nombre nulls last, p.email
      limit 15
    ) p
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.entrada_fold_texto(text) from public;
revoke all on function public.entrada_staff_buscar_personas_con_entradas(text) from public;
grant execute on function public.entrada_staff_buscar_personas_con_entradas(text) to authenticated;
