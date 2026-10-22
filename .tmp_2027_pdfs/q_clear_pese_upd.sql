DO $$
BEGIN
  ALTER TABLE public.eventos DISABLE TRIGGER USER;

  UPDATE public.eventos
  SET
    ensayo_pese_conflicto = false,
    ensayo_pese_conflicto_justificacion = NULL
  WHERE ensayo_pese_conflicto = true;

  ALTER TABLE public.eventos ENABLE TRIGGER USER;
EXCEPTION
  WHEN OTHERS THEN
    ALTER TABLE public.eventos ENABLE TRIGGER USER;
    RAISE;
END
$$;

SELECT count(*)::int AS remaining
FROM public.eventos
WHERE ensayo_pese_conflicto = true;
