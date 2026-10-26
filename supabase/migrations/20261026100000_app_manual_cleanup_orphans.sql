-- app_manual: eliminar stubs históricos (ene-2026) sin uso por ManualTrigger
-- Hijos primero por FK parent_id.

DELETE FROM public.app_manual WHERE section_key = 'sub_mkdiz90p';
DELETE FROM public.app_manual WHERE section_key IN ('sub_mkdiyeu7', 'sub_mkdiyo99');
DELETE FROM public.app_manual WHERE section_key IN (
  'gira_LOGISTICS_coverage',
  'gira_LOGISTICS_rooming',
  'gira_LOGISTICS_transporte',
  'gira_LOGISTICS_viaticos',
  'gira_LOGISTICS_meals',
  'agenda_general',
  'dashboard_general',
  'musicos_general',
  'ensambles_general',
  'gira_contexto_general',
  'artistico_root'
);
