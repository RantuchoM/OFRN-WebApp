-- Idempotencia de ingresos de recepción (cola offline / reintentos).
-- Wrapper sobre entrada_validar_y_consumir_qr; no cambia la lógica de negocio.

create table if not exists public.entrada_recepcion_client_op (
  client_op_id uuid primary key,
  concierto_id bigint references public.entrada_concierto(id) on delete set null,
  scanner_user_id uuid references public.entrada_usuario(id) on delete set null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists entrada_recepcion_client_op_created_idx
  on public.entrada_recepcion_client_op (created_at desc);

alter table public.entrada_recepcion_client_op enable row level security;

drop policy if exists "entrada recepcion client op select propia" on public.entrada_recepcion_client_op;
create policy "entrada recepcion client op select propia"
on public.entrada_recepcion_client_op
for select
using (
  scanner_user_id = auth.uid()
  or public.entrada_is_admin(auth.uid())
);

-- Inserts solo vía security definer RPC (sin policy INSERT para authenticated).

create or replace function public.entrada_validar_y_consumir_qr_idem(
  p_token text,
  p_modo text default 'auto',
  p_confirmar_parcial boolean default false,
  p_concierto_id bigint default null,
  p_ordenes_ingresar integer[] default null,
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cached jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  if p_client_op_id is not null then
    select o.result into v_cached
    from public.entrada_recepcion_client_op o
    where o.client_op_id = p_client_op_id;

    if v_cached is not null then
      return v_cached;
    end if;
  end if;

  v_result := public.entrada_validar_y_consumir_qr(
    p_token,
    p_modo,
    p_confirmar_parcial,
    p_concierto_id,
    p_ordenes_ingresar
  );

  -- Solo cachear resultados terminales. No cachear `reserva_uso_parcial` / warning
  -- (no consumen; un reintento con el mismo client_op_id quedaría trabado).
  if p_client_op_id is not null and v_result is not null then
    if coalesce((v_result->>'ok')::boolean, false)
       or coalesce(v_result->>'reason', '') in (
         'entrada_ya_usada',
         'reserva_totalmente_usada'
       )
    then
      insert into public.entrada_recepcion_client_op (
        client_op_id, concierto_id, scanner_user_id, result
      )
      values (
        p_client_op_id,
        p_concierto_id,
        auth.uid(),
        v_result
      )
      on conflict (client_op_id) do nothing;
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.entrada_validar_y_consumir_qr_idem(text, text, boolean, bigint, integer[], uuid)
  to authenticated;

comment on function public.entrada_validar_y_consumir_qr_idem(text, text, boolean, bigint, integer[], uuid) is
  'Consume QR con deduplicación por client_op_id (cola offline de recepción).';
