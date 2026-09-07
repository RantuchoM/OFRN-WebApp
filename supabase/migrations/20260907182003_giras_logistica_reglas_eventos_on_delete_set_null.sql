-- Optional event pointers on logistics rules must not block hard-delete of eventos.
-- Matches viaticos / FIMBA check-in FKs (ON DELETE SET NULL). App paths that hard-delete
-- (MealsManager, Agenda permanent delete, transport cascade) previously failed with
-- giras_logistica_reglas_id_evento_comida_fin_fkey (RESTRICT default).

ALTER TABLE public.giras_logistica_reglas
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_checkin_fkey,
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_checkout_fkey,
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_comida_inicio_fkey,
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_id_evento_comida_fin_fkey;

ALTER TABLE public.giras_logistica_reglas
  ADD CONSTRAINT giras_logistica_reglas_id_evento_checkin_fkey
    FOREIGN KEY (id_evento_checkin) REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD CONSTRAINT giras_logistica_reglas_id_evento_checkout_fkey
    FOREIGN KEY (id_evento_checkout) REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD CONSTRAINT giras_logistica_reglas_id_evento_comida_inicio_fkey
    FOREIGN KEY (id_evento_comida_inicio) REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD CONSTRAINT giras_logistica_reglas_id_evento_comida_fin_fkey
    FOREIGN KEY (id_evento_comida_fin) REFERENCES public.eventos(id) ON DELETE SET NULL;

ALTER TABLE public.giras_logistica_reglas_transportes
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_transportes_id_evento_subida_fkey,
  DROP CONSTRAINT IF EXISTS giras_logistica_reglas_transportes_id_evento_bajada_fkey;

ALTER TABLE public.giras_logistica_reglas_transportes
  ADD CONSTRAINT giras_logistica_reglas_transportes_id_evento_subida_fkey
    FOREIGN KEY (id_evento_subida) REFERENCES public.eventos(id) ON DELETE SET NULL,
  ADD CONSTRAINT giras_logistica_reglas_transportes_id_evento_bajada_fkey
    FOREIGN KEY (id_evento_bajada) REFERENCES public.eventos(id) ON DELETE SET NULL;
