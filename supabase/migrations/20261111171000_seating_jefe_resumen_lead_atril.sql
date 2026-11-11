UPDATE public.mail_plantillas
SET
  slots = jsonb_set(
    slots,
    '{lead}',
    to_jsonb(
      'El/la jefe de fila <strong>{actor_jefe}</strong> notificó cambios de seating (particellas y/o atril/silla) en la gira <strong>{gira}</strong> ({nomenclador}).'::text
    )
  ),
  updated_at = now()
WHERE template_id = 'convocatoria_gira'
  AND variant_key = 'SEATING_CAMBIO_JEFE_RESUMEN';
