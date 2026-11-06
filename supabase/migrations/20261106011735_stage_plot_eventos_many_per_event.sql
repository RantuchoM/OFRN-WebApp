-- Un concierto/ensayo puede tener varias plantas.
-- La PK (id_stage_plot, id_evento) sigue impidiendo el mismo par dos veces.
-- Se quita el índice único por evento (antes: a lo sumo un plot por evento).

DROP INDEX IF EXISTS public.stage_plot_eventos_id_evento_uniq;

COMMENT ON TABLE public.stage_plot_eventos IS
  'Asociación N:N evento↔plot (un evento puede tener varias plantas; un plot puede cubrir varios eventos). En «Ver escenario» se elige por nombre cuál exportar.';
