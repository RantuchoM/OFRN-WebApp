-- Data fix: Sol Liebeskind ruta 50 phantom seats on Camioneta CHEVROLET (gt 226).
--
-- Symptom (planilla Transportes, gt 226 AF599YN):
--   20/09 04:00 Traver baja → tránsito 0/4 + «Pausa · vehículo libre»
--   21/09 15:00 OFRN sube 4 → tránsito 6/4 (phantom +2)
--
-- Cause: ruta id=50 apuntaba a gt 226 con ↑ evento 4424 (20/09 06:50 «Traslado Hotel»)
-- y sin bajada (ride abierto forever). El evento 4424 pertenece a la flota gt 232
-- (Toyota), junto con 4467/4469 (hotel→aeropuerto JA3040). La planilla filtrada
-- por 226 no mostraba esa ↑, pero el contador unificado OFRN+FIMBA sí sumaba las
-- 2 plazas desde 06:50 en adelante (incluido el lunes).
-- El chip «Raúl Traver 2» del domingo es correcto (ruta 45 cerrada); no es alias de Sol.
--
-- Apply:
--   npx supabase db query --linked -f supabase/scripts/fix_sol_liebeskind_ruta50_gt226_open.sql

UPDATE fimba_propuesta_rutas
SET id_gira_transporte = 232,
    id_evento_bajada = 4469,
    updated_at = now()
WHERE id = 50
  AND id_propuesta = 1
  AND id_gira_transporte = 226
  AND id_evento_subida = 4424
  AND id_evento_bajada IS NULL;
