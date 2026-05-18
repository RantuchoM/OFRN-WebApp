-- Recordatorios por email cuando aún no está habilitada la reserva de entradas.

create table if not exists public.entrada_recordatorio_apertura (
  id bigint generated always as identity primary key,
  concierto_id bigint not null references public.entrada_concierto(id) on delete cascade,
  email text not null,
  usuario_id uuid references public.entrada_usuario(id) on delete set null,
  created_at timestamptz not null default now(),
  apertura_notificado_at timestamptz,
  constraint entrada_recordatorio_apertura_email_chk check (
    email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'
  )
);

create unique index if not exists entrada_recordatorio_apertura_concierto_email_uidx
  on public.entrada_recordatorio_apertura (concierto_id, lower(email));

create index if not exists entrada_recordatorio_apertura_concierto_idx
  on public.entrada_recordatorio_apertura (concierto_id);

create index if not exists entrada_recordatorio_apertura_pendiente_idx
  on public.entrada_recordatorio_apertura (concierto_id)
  where apertura_notificado_at is null;

comment on table public.entrada_recordatorio_apertura is
  'Mails interesados en ser avisados cuando se habilitan las reservas de un concierto.';

alter table public.entrada_recordatorio_apertura enable row level security;

drop policy if exists "entrada recordatorio apertura select propio email" on public.entrada_recordatorio_apertura;
create policy "entrada recordatorio apertura select propio email"
on public.entrada_recordatorio_apertura
for select
to authenticated
using (
  public.entrada_is_admin(auth.uid())
  or lower(email) = lower(coalesce(
    (select u.email from public.entrada_usuario u where u.id = auth.uid()),
    ''
  ))
);

drop policy if exists "entrada recordatorio apertura admin all" on public.entrada_recordatorio_apertura;
create policy "entrada recordatorio apertura admin all"
on public.entrada_recordatorio_apertura
for all
to authenticated
using (public.entrada_is_admin(auth.uid()))
with check (public.entrada_is_admin(auth.uid()));

create or replace function public.entrada_normalize_email(p_email text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_email, '')));
$$;

/** Fin del día (hora Argentina) a 14 días desde hoy inclusive — misma ventana que el catálogo. */
create or replace function public.entrada_fin_ventana_catalogo_ar()
returns timestamptz
language sql
stable
as $$
  select (
    (date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires')
      + interval '13 days'
      + interval '1 day' - interval '1 microsecond')
    at time zone 'America/Argentina/Buenos_Aires'
  );
$$;

create or replace function public.entrada_concierto_acepta_recordatorio(p_concierto public.entrada_concierto)
returns boolean
language sql
stable
as $$
  select
    p_concierto.id is not null
    and p_concierto.activo = true
    and p_concierto.fecha_hora > now()
    and (
      coalesce(p_concierto.reservas_habilitadas, false) = false
      or p_concierto.fecha_hora > public.entrada_fin_ventana_catalogo_ar()
    );
$$;

create or replace function public.entrada_recordatorio_apertura_info(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_concierto public.entrada_concierto;
  v_programa public.entrada_programa;
  v_elegible boolean;
begin
  if v_slug = '' then
    return jsonb_build_object('ok', false, 'error', 'Falta el concierto.');
  end if;

  select * into v_concierto
  from public.entrada_concierto c
  where lower(c.slug_publico) = v_slug
    and c.activo = true
  limit 1;

  if v_concierto.id is null then
    return jsonb_build_object('ok', false, 'error', 'No encontramos ese concierto.');
  end if;

  select * into v_programa from public.entrada_programa p where p.id = v_concierto.programa_id;

  v_elegible := public.entrada_concierto_acepta_recordatorio(v_concierto);

  return jsonb_build_object(
    'ok', true,
    'elegible', v_elegible,
    'concierto', jsonb_build_object(
      'id', v_concierto.id,
      'slug_publico', v_concierto.slug_publico,
      'nombre', v_concierto.nombre,
      'fecha_hora', v_concierto.fecha_hora,
      'lugar_nombre', v_concierto.lugar_nombre,
      'reservas_habilitadas', coalesce(v_concierto.reservas_habilitadas, false)
    ),
    'programa_nombre', coalesce(nullif(trim(v_programa.nombre), ''), 'Programa')
  );
end;
$$;

create or replace function public.entrada_suscribir_recordatorio_apertura(
  p_slug text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_email text := public.entrada_normalize_email(p_email);
  v_concierto public.entrada_concierto;
  v_ya boolean := false;
begin
  if v_slug = '' then
    raise exception 'Falta el concierto.';
  end if;
  if v_email = '' or v_email !~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'Poné un mail válido.';
  end if;

  select * into v_concierto
  from public.entrada_concierto c
  where lower(c.slug_publico) = v_slug
    and c.activo = true
  limit 1;

  if v_concierto.id is null then
    raise exception 'No encontramos ese concierto.';
  end if;

  if not public.entrada_concierto_acepta_recordatorio(v_concierto) then
    raise exception 'Para este concierto ya podés sacar entradas; no hace falta el recordatorio.';
  end if;

  select exists(
    select 1
    from public.entrada_recordatorio_apertura r
    where r.concierto_id = v_concierto.id
      and lower(r.email) = v_email
  ) into v_ya;

  if not v_ya then
    insert into public.entrada_recordatorio_apertura (concierto_id, email, usuario_id)
    values (
      v_concierto.id,
      v_email,
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'ya_estaba', v_ya,
    'concierto_id', v_concierto.id,
    'email', v_email
  );
end;
$$;

create or replace function public.entrada_consultar_recordatorio_apertura(
  p_slug text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_info jsonb;
  v_email text := public.entrada_normalize_email(p_email);
  v_concierto_id bigint;
  v_suscrito boolean := false;
begin
  v_info := public.entrada_recordatorio_apertura_info(p_slug);
  if coalesce((v_info->>'ok')::boolean, false) = false then
    return v_info;
  end if;

  v_concierto_id := (v_info->'concierto'->>'id')::bigint;

  if v_email <> '' then
    select exists(
      select 1
      from public.entrada_recordatorio_apertura r
      where r.concierto_id = v_concierto_id
        and lower(r.email) = v_email
    ) into v_suscrito;
  end if;

  return v_info || jsonb_build_object('suscrito', v_suscrito);
end;
$$;

create or replace function public.entrada_listar_recordatorios_apertura()
returns table(concierto_id bigint)
language sql
security definer
stable
set search_path = public
as $$
  select distinct r.concierto_id
  from public.entrada_recordatorio_apertura r
  inner join public.entrada_usuario u on u.id = auth.uid()
  where lower(r.email) = lower(u.email);
$$;

grant execute on function public.entrada_recordatorio_apertura_info(text) to anon, authenticated;
grant execute on function public.entrada_suscribir_recordatorio_apertura(text, text) to anon, authenticated;
grant execute on function public.entrada_consultar_recordatorio_apertura(text, text) to anon, authenticated;
grant execute on function public.entrada_listar_recordatorios_apertura() to authenticated;
