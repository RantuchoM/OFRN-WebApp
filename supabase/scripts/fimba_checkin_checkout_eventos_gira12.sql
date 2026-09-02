-- FIMBA 2026 (edición 1 / gira 12): check-in/out fecha → eventos.
--
-- Contexto:
--   OFRN asocia check-in/out vía giras_logistica_reglas.id_evento_checkin|checkout
--   a tipos_evento 22 (Check-in) / 23 (Check-Out).
--   FIMBA guardaba solo fechas en fimba_propuestas / fimba_participantes
--   (checkin_at / checkout_at). Migración 20260902122628 agrega FKs y crea
--   eventos canónicos:
--     Check-in  → 14:00
--     Check-out → 10:00
--   audiencia_ofrn = none (no confundir con logística Orquesta a las 12:00).
--
-- Re-asociación idempotente (si alguna fila quedó solo con fechas):
--   npx supabase db query --linked -f supabase/scripts/fimba_associate_stay_events_edicion1.sql
--
-- Verificación post-asociación (2026-09-02 linked):
--   prop_with_dates=16, prop_linked_both=16, legacy in/out=0, part overrides FK=4
-- Eventos canónicos FIMBA (no OFRN 12:00):
--   IN 14:00 → 4304(12), 4305(13), 4306(15), 4307(16), 4308(17), 4309(18), 4310(19), 4311(20)
--   OUT 10:00 → 4312(17), 4313(18), 4314(20), 4315(21)
-- Participantes override (Ruggiero): 13→4306/4313, 14–16→4307/4313

SELECT
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkin_at IS NOT NULL AND checkout_at IS NOT NULL) AS prop_with_dates,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND id_evento_checkin IS NOT NULL AND id_evento_checkout IS NOT NULL) AS prop_linked_both,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkin_at IS NOT NULL AND id_evento_checkin IS NULL) AS prop_legacy_in,
  (SELECT count(*)::int FROM fimba_propuestas
   WHERE id_edicion = 1 AND checkout_at IS NOT NULL AND id_evento_checkout IS NULL) AS prop_legacy_out;
