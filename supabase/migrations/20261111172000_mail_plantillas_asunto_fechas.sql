-- Anexar {fechas} a asuntos de plantillas de gira (evitar confusión entre giras).
UPDATE public.mail_plantillas
SET
  asunto = trim(both FROM asunto) || ' | {fechas}',
  updated_at = now()
WHERE coalesce(asunto, '') !~* '\{fechas\}'
  AND (
    template_id = 'convocatoria_gira'
    OR template_id IN (
      'viaticos_simple',
      'confirmacion_comidas',
      'cambio_fechas_gira',
      'cambio_alimentacion',
      'constancia_solicitud',
      'constancia_aprobada',
      'constancia_modificada',
      'constancia_denegada'
    )
    OR coalesce(asunto, '') ILIKE '%{gira}%'
  );
