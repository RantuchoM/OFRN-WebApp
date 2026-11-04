-- Mirrored from remote schema_migrations 20261103234023 (already applied).
-- Source snapshot from local 20261103210000; live DB is source of truth if they diverge.

create or replace function public.entrada_staff_listar_reservas_persona(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.entrada_normalizar_email(p_email);
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permiso';
  end if;
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'Mail inválido';
  end if;

  select coalesce(jsonb_agg(row_data order by sort_key desc, id desc), '[]'::jsonb)
  into v_out
  from (
    select
      r.id,
      (
        case
          when r.estado = 'activa' then 2
          else 0
        end
      )::int as sort_key,
      jsonb_build_object(
        'id', r.id,
        'codigo_reserva', r.codigo_reserva,
        'cantidad_solicitada', r.cantidad_solicitada,
        'estado', r.estado,
        'created_at', r.created_at,
        'cancelacion_origen', r.cancelacion_origen,
        'cupo_excepcional', r.cupo_excepcional,
        'usuario_id', r.usuario_id,
        'reservada_por', r.reservada_por,
        'email_beneficiario', r.email_beneficiario,
        'beneficiario_referencia', r.beneficiario_referencia,
        'qr_reserva_token', r.qr_reserva_token,
        'concierto_id', r.concierto_id,
        'concierto', jsonb_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'slug_publico', c.slug_publico,
          'activo', c.activo,
          'reservas_habilitadas', c.reservas_habilitadas,
          'apertura_reservas_at', c.apertura_reservas_at,
          'capacidad_maxima', c.capacidad_maxima,
          'ofrn_evento_id', c.ofrn_evento_id,
          'evento', case
            when ev.id is null then null
            else jsonb_build_object(
              'id', ev.id,
              'fecha', ev.fecha,
              'hora_inicio', ev.hora_inicio,
              'id_locacion', ev.id_locacion
            )
          end
        ),
        'entradas', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'orden', e.orden,
              'estado_ingreso', e.estado_ingreso,
              'ingresada_at', e.ingresada_at,
              'qr_entrada_token', e.qr_entrada_token
            )
            order by e.orden
          )
          from public.entrada_reserva_entrada e
          where e.reserva_id = r.id
        ), '[]'::jsonb),
        'titular', case
          when u.id is null then null
          else jsonb_build_object(
            'id', u.id,
            'nombre', u.nombre,
            'apellido', u.apellido,
            'email', u.email
          )
        end
      ) as row_data
    from public.entrada_reserva r
    left join public.entrada_usuario u on u.id = r.usuario_id
    left join public.entrada_concierto c on c.id = r.concierto_id
    left join public.eventos ev on ev.id = c.ofrn_evento_id
    where (
      public.entrada_normalizar_email(u.email) = v_email
      or public.entrada_normalizar_email(r.email_beneficiario) = v_email
    )
  ) q;

  return coalesce(v_out, '[]'::jsonb);
end;
$$;

comment on function public.entrada_staff_listar_reservas_persona(text) is
  'Staff (entrada_can_terceros): historial de reservas de un mail (titular o beneficiario).';

revoke all on function public.entrada_staff_listar_reservas_persona(text) from public;
grant execute on function public.entrada_staff_listar_reservas_persona(text) to authenticated;

-- 2) Ampliar permiso de cambio de cantidad a todo staff con terceros.
