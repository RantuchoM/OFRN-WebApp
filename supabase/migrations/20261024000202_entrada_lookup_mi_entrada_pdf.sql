-- Lookup público: mail (+ slug de concierto) → pdf_share_token de reserva activa.
-- Rate limit por mail para limitar enumeración (pantalla /entradas/mi-entrada).

create table if not exists public.entrada_pdf_lookup_attempt (
  id bigserial primary key,
  email_norm text not null,
  created_at timestamptz not null default now()
);

create index if not exists entrada_pdf_lookup_attempt_email_created_idx
  on public.entrada_pdf_lookup_attempt (email_norm, created_at desc);

comment on table public.entrada_pdf_lookup_attempt is
  'Intentos de lookup PDF por mail (rate limit de entrada_lookup_mi_entrada_pdf).';

alter table public.entrada_pdf_lookup_attempt enable row level security;

-- Sin policies: solo security definer escribe/lee.

create or replace function public.entrada_lookup_mi_entrada_pdf(
  p_email text,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.entrada_normalize_email(p_email);
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_recent int := 0;
  v_concierto_id bigint;
  v_reserva public.entrada_reserva;
  v_token text;
  v_count int := 0;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Poné un mail válido (el mismo con el que sacaste la entrada).'
    );
  end if;

  select count(*)::int into v_recent
  from public.entrada_pdf_lookup_attempt a
  where a.email_norm = v_email
    and a.created_at > now() - interval '10 minutes';

  if v_recent >= 10 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Demasiados intentos. Esperá unos minutos y probá de nuevo.'
    );
  end if;

  insert into public.entrada_pdf_lookup_attempt (email_norm)
  values (v_email);

  if v_slug is not null then
    select c.id into v_concierto_id
    from public.entrada_concierto c
    where c.slug_publico = v_slug
      and c.activo = true
    limit 1;

    if v_concierto_id is null then
      return jsonb_build_object(
        'ok', false,
        'error', 'No encontramos ese concierto. Usá el enlace del mail de recordatorio.'
      );
    end if;
  end if;

  select count(*)::int into v_count
  from public.entrada_reserva r
  inner join public.entrada_usuario u on u.id = r.usuario_id
  where r.estado = 'activa'
    and lower(trim(u.email)) = v_email
    and (v_concierto_id is null or r.concierto_id = v_concierto_id);

  if v_count = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'No hay una entrada activa con ese mail'
        || case when v_slug is not null then ' para este concierto.' else '.' end
        || ' Revisá que esté bien escrito.'
    );
  end if;

  if v_concierto_id is null and v_count > 1 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Tenés más de una entrada activa. Abrí el enlace del mail de recordatorio del concierto que buscás.'
    );
  end if;

  select r.* into v_reserva
  from public.entrada_reserva r
  inner join public.entrada_usuario u on u.id = r.usuario_id
  where r.estado = 'activa'
    and lower(trim(u.email)) = v_email
    and (v_concierto_id is null or r.concierto_id = v_concierto_id)
  order by r.created_at desc
  limit 1;

  if v_reserva.id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'No hay una entrada activa con ese mail.'
    );
  end if;

  v_token := nullif(btrim(coalesce(v_reserva.pdf_share_token, '')), '');
  if v_token is null then
    v_token := public.entrada_new_pdf_share_token();
    update public.entrada_reserva
    set pdf_share_token = v_token
    where id = v_reserva.id
      and estado = 'activa';
  end if;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'codigo_reserva', v_reserva.codigo_reserva,
    'reserva_id', v_reserva.id
  );
end;
$$;

comment on function public.entrada_lookup_mi_entrada_pdf(text, text) is
  'Público: por mail (+ slug opcional) devuelve pdf_share_token de reserva activa. Rate limit 10/10min por mail.';

revoke all on function public.entrada_lookup_mi_entrada_pdf(text, text) from public;
grant execute on function public.entrada_lookup_mi_entrada_pdf(text, text) to anon, authenticated;

-- Limpieza liviana de intentos viejos (opcional, al vuelo en lookup no hace falta).
create or replace function public.entrada_pdf_lookup_attempt_purge()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.entrada_pdf_lookup_attempt
  where created_at < now() - interval '2 days';
$$;

revoke all on function public.entrada_pdf_lookup_attempt_purge() from public;
