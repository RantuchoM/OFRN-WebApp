-- Recordatorios de salida de ensayo (T−10 push / T+15 push+email)
-- + suscripciones Web Push.

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id bigserial PRIMARY KEY,
  id_integrante bigint NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT web_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_integrante_idx
  ON public.web_push_subscriptions (id_integrante);

CREATE TABLE IF NOT EXISTS public.eventos_checkin_recordatorios (
  id bigserial PRIMARY KEY,
  id_evento bigint NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  id_integrante bigint NOT NULL REFERENCES public.integrantes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  canal text NOT NULL,
  enviado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_checkin_recordatorios_tipo_check
    CHECK (tipo = ANY (ARRAY['pre_cierre'::text, 'post_cierre'::text])),
  CONSTRAINT eventos_checkin_recordatorios_canal_check
    CHECK (canal = ANY (ARRAY['push'::text, 'email'::text])),
  CONSTRAINT eventos_checkin_recordatorios_unique
    UNIQUE (id_evento, id_integrante, tipo, canal)
);

CREATE INDEX IF NOT EXISTS eventos_checkin_recordatorios_lookup_idx
  ON public.eventos_checkin_recordatorios (id_evento, id_integrante);

-- Suscribir / actualizar endpoint del integrante (security definer)
CREATE OR REPLACE FUNCTION public.web_push_subscribe(
  p_integrante_id bigint,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_integrante_id IS NULL
     OR p_endpoint IS NULL OR btrim(p_endpoint) = ''
     OR p_p256dh IS NULL OR btrim(p_p256dh) = ''
     OR p_auth IS NULL OR btrim(p_auth) = ''
  THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_params');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.integrantes i WHERE i.id = p_integrante_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'integrante_not_found');
  END IF;

  INSERT INTO public.web_push_subscriptions (
    id_integrante, endpoint, p256dh, auth, user_agent, updated_at
  )
  VALUES (
    p_integrante_id,
    btrim(p_endpoint),
    btrim(p_p256dh),
    btrim(p_auth),
    NULLIF(btrim(COALESCE(p_user_agent, '')), ''),
    now()
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    id_integrante = EXCLUDED.id_integrante,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = COALESCE(EXCLUDED.user_agent, public.web_push_subscriptions.user_agent),
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.web_push_subscribe(bigint, text, text, text, text) TO anon, authenticated, service_role;

COMMENT ON TABLE public.web_push_subscriptions IS
  'Suscripciones Web Push (PWA) por integrante; usadas por ensayo-salida-recordatorios.';
COMMENT ON TABLE public.eventos_checkin_recordatorios IS
  'Idempotencia de recordatorios pre_cierre / post_cierre (push|email) por (evento, integrante).';

-- Cron cada 5 min → Edge Function ensayo-salida-recordatorios
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-ensayo-salida-recordatorios';

SELECT cron.schedule(
  'ofrn-ensayo-salida-recordatorios',
  '*/5 * * * *',
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
