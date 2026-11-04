-- Performance hardening after Nano→Micro memory incident:
-- 1) Throttle high-frequency crons (*/5 → */15, same ART daytime window)
-- 2) Wrap auth.*()/current_setting() in RLS policies as (select ...) InitPlan
-- 3) Cover hot FK columns + drop duplicate unique index on giras_integrantes

-- ---------------------------------------------------------------------------
-- 1) Crons: less background churn on Auth/PostgREST/Edge
-- ---------------------------------------------------------------------------
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-salida-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-salida-recordatorios',
  '*/15 11-23,0-1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-salida-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'apikey', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'x-ensayo-salida-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_salida_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-inicio-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-inicio-recordatorios',
  '*/15 11-23,0-1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-inicio-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'apikey', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1),
        ''
      ),
      'x-ensayo-inicio-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_inicio_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ensayo_salida_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-conciertos-sheet-pending';

SELECT cron.schedule(
  'ofrn-conciertos-sheet-pending',
  '*/15 11-23,0-1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/sync-conciertos-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_service_role' LIMIT 1
      ),
      'x-conciertos-sheet-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'conciertos_sheet_cron_secret' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'db_backup_cron_secret' LIMIT 1)
      )
    ),
    body := '{"flushPending":true}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id
  FROM public.conciertos_sheet_sync
  WHERE id = 1 AND pending = true;
  $$
);

-- Entradas mail cron: 30 → 45 min (still timely, fewer cold starts)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'entradas-cron-mails';

SELECT cron.schedule(
  'entradas-cron-mails',
  '*/45 * * * *',
  $$
  select
    net.http_post(
        url:='https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/entradas-cron-mails',
        headers:='{}'::jsonb,
        timeout_milliseconds:=1000
    );
  $$
);

-- ---------------------------------------------------------------------------
-- 2) RLS InitPlan: auth.*/current_setting → (select ...) on hot tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.__tmp_wrap_rls_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  out text := expr;
BEGIN
  IF out IS NULL OR btrim(out) = '' THEN
    RETURN out;
  END IF;

  out := replace(out, '(select auth.uid())', '.__AUID__');
  out := replace(out, '(select auth.jwt())', '.__AJWT__');
  out := replace(out, '(select auth.role())', '.__AROLE__');
  out := replace(out, '(select auth.email())', '.__AEMAIL__');
  out := replace(out, '(select current_setting(', '.__CSET__(');

  out := replace(out, 'auth.uid()', '(select auth.uid())');
  out := replace(out, 'auth.jwt()', '(select auth.jwt())');
  out := replace(out, 'auth.role()', '(select auth.role())');
  out := replace(out, 'auth.email()', '(select auth.email())');
  out := replace(out, 'current_setting(', '(select current_setting(');

  out := replace(out, '.__AUID__', '(select auth.uid())');
  out := replace(out, '.__AJWT__', '(select auth.jwt())');
  out := replace(out, '.__AROLE__', '(select auth.role())');
  out := replace(out, '.__AEMAIL__', '(select auth.email())');
  out := replace(out, '.__CSET__(', '(select current_setting(');
  RETURN out;
END;
$$;

DO $$
DECLARE
  pol record;
  roles_sql text;
  using_expr text;
  check_expr text;
  cmd_sql text;
  permissive_sql text;
  create_sql text;
  tables text[] := ARRAY[
    'entrada_reserva',
    'entrada_reserva_entrada',
    'entrada_usuario',
    'entrada_ingreso_evento',
    'entrada_programa',
    'entrada_concierto',
    'entrada_ayuda_consulta',
    'entrada_recordatorio_apertura',
    'entrada_recepcion_client_op',
    'entrada_concierto_sin_entrada',
    'scrn_reserva_pasajeros',
    'scrn_notificaciones',
    'scrn_rutas',
    'scrn_ruta_paradas',
    'viaticos_manual_usuario',
    'viaticos_manual_viatico',
    'viaticos_manual_rendicion'
  ];
BEGIN
  FOR pol IN
    SELECT *
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (tables)
      AND (
        COALESCE(qual, '') ~ 'auth\.(uid|jwt|role|email)\(\)'
        OR COALESCE(with_check, '') ~ 'auth\.(uid|jwt|role|email)\(\)'
        OR COALESCE(qual, '') ~ 'current_setting\('
        OR COALESCE(with_check, '') ~ 'current_setting\('
      )
  LOOP
    using_expr := public.__tmp_wrap_rls_initplan(pol.qual);
    check_expr := public.__tmp_wrap_rls_initplan(pol.with_check);

    IF using_expr IS NOT DISTINCT FROM pol.qual
       AND check_expr IS NOT DISTINCT FROM pol.with_check THEN
      CONTINUE;
    END IF;

    roles_sql := array_to_string(
      ARRAY(
        SELECT quote_ident(r)
        FROM unnest(pol.roles) AS r
      ),
      ', '
    );
    IF roles_sql IS NULL OR roles_sql = '' THEN
      roles_sql := 'public';
    END IF;

    cmd_sql := upper(pol.cmd);
    IF cmd_sql NOT IN ('ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN
      RAISE EXCEPTION 'Unsupported RLS command % on %.%', pol.cmd, pol.tablename, pol.policyname;
    END IF;

    permissive_sql := CASE
      WHEN upper(pol.permissive) = 'RESTRICTIVE' THEN 'AS RESTRICTIVE'
      ELSE 'AS PERMISSIVE'
    END;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      pol.policyname,
      pol.tablename
    );

    create_sql := format(
      'CREATE POLICY %I ON public.%I %s FOR %s TO %s',
      pol.policyname,
      pol.tablename,
      permissive_sql,
      cmd_sql,
      roles_sql
    );

    IF using_expr IS NOT NULL THEN
      create_sql := create_sql || ' USING (' || using_expr || ')';
    END IF;
    IF check_expr IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || check_expr || ')';
    END IF;

    EXECUTE create_sql;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.__tmp_wrap_rls_initplan(text);

-- ---------------------------------------------------------------------------
-- 3) Hot FK indexes + duplicate unique cleanup
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS entrada_ayuda_consulta_concierto_destino_id_idx
  ON public.entrada_ayuda_consulta (concierto_destino_id);
CREATE INDEX IF NOT EXISTS entrada_ayuda_consulta_concierto_id_idx
  ON public.entrada_ayuda_consulta (concierto_id);
CREATE INDEX IF NOT EXISTS entrada_ayuda_consulta_reserva_id_idx
  ON public.entrada_ayuda_consulta (reserva_id);
CREATE INDEX IF NOT EXISTS entrada_ayuda_consulta_reserva_pedido_id_idx
  ON public.entrada_ayuda_consulta (reserva_pedido_id);

CREATE INDEX IF NOT EXISTS entrada_ingreso_evento_reserva_entrada_id_idx
  ON public.entrada_ingreso_evento (reserva_entrada_id);
CREATE INDEX IF NOT EXISTS entrada_ingreso_evento_reserva_id_idx
  ON public.entrada_ingreso_evento (reserva_id);
CREATE INDEX IF NOT EXISTS entrada_ingreso_evento_scanner_user_id_idx
  ON public.entrada_ingreso_evento (scanner_user_id);

CREATE INDEX IF NOT EXISTS entrada_recepcion_client_op_concierto_id_idx
  ON public.entrada_recepcion_client_op (concierto_id);
CREATE INDEX IF NOT EXISTS entrada_recepcion_client_op_scanner_user_id_idx
  ON public.entrada_recepcion_client_op (scanner_user_id);

CREATE INDEX IF NOT EXISTS entrada_recordatorio_apertura_usuario_id_idx
  ON public.entrada_recordatorio_apertura (usuario_id);

CREATE INDEX IF NOT EXISTS entrada_reserva_entrada_concierto_id_idx
  ON public.entrada_reserva_entrada (concierto_id);
CREATE INDEX IF NOT EXISTS entrada_reserva_entrada_ingresada_por_idx
  ON public.entrada_reserva_entrada (ingresada_por);

CREATE INDEX IF NOT EXISTS eventos_id_gira_idx ON public.eventos (id_gira);
CREATE INDEX IF NOT EXISTS eventos_id_locacion_idx ON public.eventos (id_locacion);
CREATE INDEX IF NOT EXISTS eventos_id_tipo_evento_idx ON public.eventos (id_tipo_evento);
CREATE INDEX IF NOT EXISTS eventos_id_gira_transporte_idx ON public.eventos (id_gira_transporte);
CREATE INDEX IF NOT EXISTS eventos_id_estado_venue_idx ON public.eventos (id_estado_venue);

CREATE INDEX IF NOT EXISTS eventos_asistencia_id_integrante_idx
  ON public.eventos_asistencia (id_integrante);
CREATE INDEX IF NOT EXISTS eventos_asistencia_custom_id_evento_idx
  ON public.eventos_asistencia_custom (id_evento);
CREATE INDEX IF NOT EXISTS eventos_asistencia_custom_id_integrante_idx
  ON public.eventos_asistencia_custom (id_integrante);

CREATE INDEX IF NOT EXISTS eventos_ensambles_id_ensamble_idx
  ON public.eventos_ensambles (id_ensamble);
CREATE INDEX IF NOT EXISTS eventos_ensambles_id_evento_idx
  ON public.eventos_ensambles (id_evento);

CREATE INDEX IF NOT EXISTS eventos_programas_asociados_id_evento_idx
  ON public.eventos_programas_asociados (id_evento);
CREATE INDEX IF NOT EXISTS eventos_programas_asociados_id_programa_idx
  ON public.eventos_programas_asociados (id_programa);

CREATE INDEX IF NOT EXISTS giras_integrantes_id_integrante_idx
  ON public.giras_integrantes (id_integrante);
CREATE INDEX IF NOT EXISTS giras_integrantes_id_instr_idx
  ON public.giras_integrantes (id_instr);
CREATE INDEX IF NOT EXISTS giras_integrantes_id_cubre_a_idx
  ON public.giras_integrantes (id_cubre_a);
CREATE INDEX IF NOT EXISTS giras_integrantes_movido_por_idx
  ON public.giras_integrantes (movido_por);

CREATE INDEX IF NOT EXISTS giras_logistica_admision_id_gira_idx
  ON public.giras_logistica_admision (id_gira);
CREATE INDEX IF NOT EXISTS giras_logistica_admision_id_integrante_idx
  ON public.giras_logistica_admision (id_integrante);
CREATE INDEX IF NOT EXISTS giras_logistica_reglas_id_gira_idx
  ON public.giras_logistica_reglas (id_gira);

-- Keep constraint-backed unique; drop redundant explicit unique index.
DROP INDEX IF EXISTS public.giras_integrantes_gira_integrante_uidx;
