-- Token opaco para descargar el PDF de entradas sin login (WhatsApp / link público).
-- Usa gen_random_uuid() (disponible en public); no gen_random_bytes (vive en extensions).

alter table public.entrada_reserva
  add column if not exists pdf_share_token text;

comment on column public.entrada_reserva.pdf_share_token is
  'Token opaco para /entradas/pdf?t= (PDF sin sesión).';

create unique index if not exists entrada_reserva_pdf_share_token_uidx
  on public.entrada_reserva (pdf_share_token)
  where pdf_share_token is not null;

create or replace function public.entrada_new_pdf_share_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '')
      || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function public.entrada_reserva_assign_pdf_share_token()
returns trigger
language plpgsql
as $$
begin
  if new.pdf_share_token is null or btrim(new.pdf_share_token) = '' then
    new.pdf_share_token := public.entrada_new_pdf_share_token();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_entrada_reserva_pdf_share_token on public.entrada_reserva;
create trigger trg_entrada_reserva_pdf_share_token
before insert on public.entrada_reserva
for each row
execute function public.entrada_reserva_assign_pdf_share_token();

-- Backfill reservas activas existentes
update public.entrada_reserva
set pdf_share_token = public.entrada_new_pdf_share_token()
where pdf_share_token is null
  and estado = 'activa';

create or replace function public.entrada_ensure_pdf_share_token(p_reserva_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_reserva;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_row
  from public.entrada_reserva
  where id = p_reserva_id
  for update;

  if not found then
    raise exception 'Reserva no encontrada';
  end if;

  if not (
    public.entrada_can_terceros(auth.uid())
    or v_row.usuario_id = auth.uid()
    or v_row.reservada_por = auth.uid()
  ) then
    raise exception 'Sin permiso';
  end if;

  if v_row.pdf_share_token is not null and btrim(v_row.pdf_share_token) <> '' then
    return v_row.pdf_share_token;
  end if;

  v_token := public.entrada_new_pdf_share_token();
  update public.entrada_reserva
  set pdf_share_token = v_token
  where id = p_reserva_id;

  return v_token;
end;
$$;

revoke all on function public.entrada_ensure_pdf_share_token(bigint) from public;
grant execute on function public.entrada_ensure_pdf_share_token(bigint) to authenticated;
