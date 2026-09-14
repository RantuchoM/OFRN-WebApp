-- Data fix: Camarada Tango Quartet ruta #27 orphan ↓ on Chevrolet AF599YN (gt 226).
--
-- Symptom (hoja Chevrolet AF599YN):
--   Parada ajena #5 = evento 3867 «Traslado al Aeropuerto» 15/09 09:50 Hotel Flamingo
--   (flota real gt 232 Toyota AB808YX; tag = Alba Carmona, no Camarada).
--
-- Cause: fimba_propuesta_rutas id=27
--   · id_propuesta = 8 (Camarada), plazas 4
--   · id_gira_transporte = 226 (Chevrolet) ← wrong fleet
--   · id_evento_subida = NULL
--   · id_evento_bajada = 3867 ← ↓-only on a Toyota stop
-- collectVehicleRideEndpointIds injected 3867 into gt 226 sequence/hoja.
--
-- Why delete (not move to 232):
--   · No ↑ known; ↓-only at hotel→airport start is incoherent.
--   · 3867 is tagged Alba; Camarada's real rides are 41/42/43/88 (17–20/09).
--   · Toyota 15/09 already has coherent Alba ↑4363→↓4383 and Ruggiero ↑4393→↓3910.
--
-- Apply:
--   npx supabase db query --linked -f supabase/scripts/fix_camarada_ruta27_gt226_orphan.sql
--
-- Idempotent: no-op if ruta 27 already gone / no longer matches the orphan shape.

DELETE FROM fimba_propuesta_rutas
WHERE id = 27
  AND id_propuesta = 8
  AND id_gira_transporte = 226
  AND id_evento_subida IS NULL
  AND id_evento_bajada = 3867
  AND plazas = 4;
