-- Debt remediation: admin localidades RPC, merge hot permissive RLS, FK indexes.

-- ---------------------------------------------------------------------------
-- 1) RPC: localidades por usuario (admin) — sustituye nest de todas las reservas
-- ---------------------------------------------------------------------------
create or replace function public.entrada_admin_usuarios_localidades()
returns table(usuario_id uuid, localidad text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permiso';
  end if;

  return query
  select distinct
    r.usuario_id,
    nullif(btrim(loc.localidad), '') as localidad
  from public.entrada_reserva r
  join public.entrada_concierto c on c.id = r.concierto_id
  join public.eventos e on e.id = c.ofrn_evento_id
  join public.locaciones l on l.id = e.id_locacion
  join public.localidades loc on loc.id = l.id_localidad
  where r.usuario_id is not null
    and nullif(btrim(loc.localidad), '') is not null;
end;
$$;

comment on function public.entrada_admin_usuarios_localidades() is
  'Admin: pares (usuario_id, localidad) desde reservas; payload liviano para roster.';

revoke all on function public.entrada_admin_usuarios_localidades() from public;
grant execute on function public.entrada_admin_usuarios_localidades() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Merge multiple permissive policies (SCRN pasajeros + Entradas)
-- ---------------------------------------------------------------------------

-- scrn_reserva_pasajeros: 10 → 4 (una por cmd)
drop policy if exists "Admins leen acompañantes" on public.scrn_reserva_pasajeros;
drop policy if exists "Solicitante lee acompañantes de su reserva" on public.scrn_reserva_pasajeros;
drop policy if exists "Pasajero lee su fila de pasajero" on public.scrn_reserva_pasajeros;
drop policy if exists "Admins insertan acompañantes" on public.scrn_reserva_pasajeros;
drop policy if exists "Solicitante inserta acompañantes de su reserva" on public.scrn_reserva_pasajeros;
drop policy if exists "Admins actualizan acompañantes" on public.scrn_reserva_pasajeros;
drop policy if exists "Solicitante edita acompañantes de su reserva" on public.scrn_reserva_pasajeros;
drop policy if exists "Pasajero actualiza su fila de pasajero" on public.scrn_reserva_pasajeros;
drop policy if exists "Admins eliminan acompañantes" on public.scrn_reserva_pasajeros;
drop policy if exists "Solicitante elimina acompañantes de su reserva" on public.scrn_reserva_pasajeros;

create policy "scrn_reserva_pasajeros_select"
  on public.scrn_reserva_pasajeros
  for select
  to public
  using (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = (select auth.uid()) and p.es_admin = true
    )
    or exists (
      select 1 from public.scrn_reservas r
      where r.id = scrn_reserva_pasajeros.id_reserva
        and r.id_usuario = (select auth.uid())
    )
    or (id_perfil is not null and id_perfil = (select auth.uid()))
  );

create policy "scrn_reserva_pasajeros_insert"
  on public.scrn_reserva_pasajeros
  for insert
  to public
  with check (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = (select auth.uid()) and p.es_admin = true
    )
    or exists (
      select 1 from public.scrn_reservas r
      where r.id = scrn_reserva_pasajeros.id_reserva
        and r.id_usuario = (select auth.uid())
    )
  );

create policy "scrn_reserva_pasajeros_update"
  on public.scrn_reserva_pasajeros
  for update
  to public
  using (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = (select auth.uid()) and p.es_admin = true
    )
    or exists (
      select 1 from public.scrn_reservas r
      where r.id = scrn_reserva_pasajeros.id_reserva
        and r.id_usuario = (select auth.uid())
    )
    or (id_perfil is not null and id_perfil = (select auth.uid()))
  )
  with check (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = (select auth.uid()) and p.es_admin = true
    )
    or exists (
      select 1 from public.scrn_reservas r
      where r.id = scrn_reserva_pasajeros.id_reserva
        and r.id_usuario = (select auth.uid())
    )
    or (id_perfil is not null and id_perfil = (select auth.uid()))
  );

create policy "scrn_reserva_pasajeros_delete"
  on public.scrn_reserva_pasajeros
  for delete
  to public
  using (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = (select auth.uid()) and p.es_admin = true
    )
    or exists (
      select 1 from public.scrn_reservas r
      where r.id = scrn_reserva_pasajeros.id_reserva
        and r.id_usuario = (select auth.uid())
    )
  );

-- entrada_usuario: 2 SELECT → 1
drop policy if exists "entrada usuario lee propio" on public.entrada_usuario;
drop policy if exists "entrada usuario lee titular tercero" on public.entrada_usuario;

create policy "entrada usuario select"
  on public.entrada_usuario
  for select
  to public
  using (
    id = (select auth.uid())
    or public.entrada_is_admin((select auth.uid()))
    or public.entrada_usuario_es_titular_de_tercero_propio(id)
  );

-- entrada_programa / entrada_concierto: ALL+SELECT → write cmds + un solo SELECT
drop policy if exists "entrada programas admin crud" on public.entrada_programa;
create policy "entrada programas admin insert"
  on public.entrada_programa for insert to public
  with check (public.entrada_is_admin((select auth.uid())));
create policy "entrada programas admin update"
  on public.entrada_programa for update to public
  using (public.entrada_is_admin((select auth.uid())))
  with check (public.entrada_is_admin((select auth.uid())));
create policy "entrada programas admin delete"
  on public.entrada_programa for delete to public
  using (public.entrada_is_admin((select auth.uid())));

drop policy if exists "entrada conciertos admin crud" on public.entrada_concierto;
create policy "entrada conciertos admin insert"
  on public.entrada_concierto for insert to public
  with check (public.entrada_is_admin((select auth.uid())));
create policy "entrada conciertos admin update"
  on public.entrada_concierto for update to public
  using (public.entrada_is_admin((select auth.uid())))
  with check (public.entrada_is_admin((select auth.uid())));
create policy "entrada conciertos admin delete"
  on public.entrada_concierto for delete to public
  using (public.entrada_is_admin((select auth.uid())));

-- ---------------------------------------------------------------------------
-- 3) FK indexes (giras logística + check-in / venue / logs)
-- ---------------------------------------------------------------------------
create index if not exists eventos_checkin_ensayo_id_editado_por_idx
  on public.eventos_checkin_ensayo (id_editado_por);
create index if not exists eventos_checkin_ensayo_id_integrante_prestador_idx
  on public.eventos_checkin_ensayo (id_integrante_prestador);
create index if not exists eventos_checkin_ensayo_id_integrante_prestador_salida_idx
  on public.eventos_checkin_ensayo (id_integrante_prestador_salida);

create index if not exists eventos_checkin_pase_id_evento_idx
  on public.eventos_checkin_pase (id_evento);
create index if not exists eventos_checkin_pase_id_integrante_prestador_idx
  on public.eventos_checkin_pase (id_integrante_prestador);
create index if not exists eventos_checkin_pase_id_integrante_usuario_idx
  on public.eventos_checkin_pase (id_integrante_usuario);

create index if not exists eventos_checkin_recordatorios_id_integrante_idx
  on public.eventos_checkin_recordatorios (id_integrante);

create index if not exists eventos_giras_asociadas_id_evento_idx
  on public.eventos_giras_asociadas (id_evento);
create index if not exists eventos_giras_asociadas_id_gira_idx
  on public.eventos_giras_asociadas (id_gira);

create index if not exists eventos_logs_id_evento_idx
  on public.eventos_logs (id_evento);
create index if not exists eventos_logs_created_by_idx
  on public.eventos_logs (created_by);

create index if not exists eventos_venue_log_id_evento_idx
  on public.eventos_venue_log (id_evento);
create index if not exists eventos_venue_log_id_estado_venue_idx
  on public.eventos_venue_log (id_estado_venue);
create index if not exists eventos_venue_log_id_integrante_idx
  on public.eventos_venue_log (id_integrante);

create index if not exists giras_logistica_admision_id_localidad_idx
  on public.giras_logistica_admision (id_localidad);
create index if not exists giras_logistica_admision_id_region_idx
  on public.giras_logistica_admision (id_region);
create index if not exists giras_logistica_admision_id_transporte_fisico_idx
  on public.giras_logistica_admision (id_transporte_fisico);

create index if not exists giras_logistica_reglas_id_evento_checkin_idx
  on public.giras_logistica_reglas (id_evento_checkin);
create index if not exists giras_logistica_reglas_id_evento_checkin_early_idx
  on public.giras_logistica_reglas (id_evento_checkin_early);
create index if not exists giras_logistica_reglas_id_evento_checkout_idx
  on public.giras_logistica_reglas (id_evento_checkout);
create index if not exists giras_logistica_reglas_id_evento_checkout_late_idx
  on public.giras_logistica_reglas (id_evento_checkout_late);

create index if not exists giras_logistica_reglas_transportes_id_evento_bajada_idx
  on public.giras_logistica_reglas_transportes (id_evento_bajada);
create index if not exists giras_logistica_reglas_transportes_id_evento_subida_idx
  on public.giras_logistica_reglas_transportes (id_evento_subida);
create index if not exists giras_logistica_reglas_transportes_id_localidad_idx
  on public.giras_logistica_reglas_transportes (id_localidad);
create index if not exists giras_logistica_reglas_transportes_id_region_idx
  on public.giras_logistica_reglas_transportes (id_region);

create index if not exists giras_logistica_rutas_id_gira_idx
  on public.giras_logistica_rutas (id_gira);
create index if not exists giras_logistica_rutas_id_integrante_idx
  on public.giras_logistica_rutas (id_integrante);
create index if not exists giras_logistica_rutas_id_evento_subida_idx
  on public.giras_logistica_rutas (id_evento_subida);
create index if not exists giras_logistica_rutas_id_evento_bajada_idx
  on public.giras_logistica_rutas (id_evento_bajada);
create index if not exists giras_logistica_rutas_id_localidad_idx
  on public.giras_logistica_rutas (id_localidad);
create index if not exists giras_logistica_rutas_id_region_idx
  on public.giras_logistica_rutas (id_region);
create index if not exists giras_logistica_rutas_id_transporte_fisico_idx
  on public.giras_logistica_rutas (id_transporte_fisico);
