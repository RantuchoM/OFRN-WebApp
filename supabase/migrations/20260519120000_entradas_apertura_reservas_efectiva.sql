-- Apertura efectiva: si apertura_reservas_at es NULL, jueves 19:00 AR de la semana anterior al concierto.

comment on column public.entrada_concierto.apertura_reservas_at is
  'Momento en que se habilita sacar entradas. NULL = jueves 19:00 de la semana anterior al concierto (hora Argentina).';

create or replace function public.entrada_concierto_apertura_reservas_efectiva(p_concierto public.entrada_concierto)
returns timestamptz
language sql
stable
as $$
  select coalesce(
    p_concierto.apertura_reservas_at,
    case
      when p_concierto.fecha_hora is null then null
      else (
        (
          date_trunc(
            'week',
            (p_concierto.fecha_hora at time zone 'America/Argentina/Buenos_Aires')::date
          )::timestamp
          - interval '4 days'
          + time '19:00:00'
        ) at time zone 'America/Argentina/Buenos_Aires'
      )
    end
  );
$$;

create or replace function public.entrada_concierto_reservas_abiertas(p_concierto public.entrada_concierto)
returns boolean
language sql
stable
as $$
  select
    p_concierto.id is not null
    and coalesce(p_concierto.activo, false) = true
    and coalesce(p_concierto.reservas_habilitadas, false) = true
    and public.entrada_concierto_apertura_reservas_efectiva(p_concierto) is not null
    and now() >= public.entrada_concierto_apertura_reservas_efectiva(p_concierto);
$$;

grant execute on function public.entrada_concierto_apertura_reservas_efectiva(public.entrada_concierto) to anon, authenticated;
