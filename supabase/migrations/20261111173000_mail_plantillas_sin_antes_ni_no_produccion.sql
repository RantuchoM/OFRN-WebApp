-- Quitar "(antes: …)" del cuerpo de atril y "(no producción)" de actor_nota.
UPDATE public.mail_plantillas
SET
  slots = jsonb_set(
    slots,
    '{cuerpo}',
    to_jsonb(
      'Estás sentado/a en la <strong>{asiento}</strong> del contenedor <strong>{contenedor}</strong>.'::text
    )
  ),
  updated_at = now()
WHERE template_id = 'convocatoria_gira'
  AND variant_key = 'SEATING_ATRIL_CAMBIO';

UPDATE public.mail_plantillas
SET
  slots = jsonb_set(
    slots,
    '{actor_nota}',
    to_jsonb(
      'Este cambio lo efectuó el/la jefe de fila {actor_jefe}.'::text
    )
  ),
  updated_at = now()
WHERE template_id = 'convocatoria_gira'
  AND variant_key IN ('SEATING_CAMBIO', 'SEATING_ATRIL_CAMBIO');
