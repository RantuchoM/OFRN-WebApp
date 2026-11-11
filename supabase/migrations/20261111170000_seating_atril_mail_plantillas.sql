-- Plantillas: resumen jefe → Marko + aviso de cambio de atril/silla.

INSERT INTO public.mail_plantillas (template_id, variant_key, titulo, asunto, slots)
VALUES
  (
    'convocatoria_gira',
    'SEATING_CAMBIO_JEFE_RESUMEN',
    'Resumen de cambios del jefe de fila (a Marko)',
    'Resumen seating (jefe de fila) | {gira}',
    jsonb_build_object(
      'titulo_interno', 'Resumen de cambios de seating',
      'lead', 'El/la jefe de fila <strong>{actor_jefe}</strong> notificó cambios de particella en la gira <strong>{gira}</strong> ({nomenclador}).',
      'reason', '{motivo}',
      'cierre', 'Resumen automático del Sistema de Gestión.',
      'footer', 'Orquesta Filarmónica de Río Negro – Sistema de Gestión'
    )
  ),
  (
    'convocatoria_gira',
    'SEATING_ATRIL_CAMBIO',
    'Cambio de atril / silla',
    'Cambio de atril | {gira}',
    jsonb_build_object(
      'titulo_interno', 'Cambio de atril',
      'lead', 'En la gira <strong>{gira}</strong> ({nomenclador}), bloque <strong>{bloque}</strong>, tu lugar quedó así:',
      'cuerpo', 'Estás sentado/a en la <strong>{asiento}</strong> del contenedor <strong>{contenedor}</strong> (antes: {asiento_previo}).',
      'actor_nota', 'Este cambio lo efectuó el/la jefe de fila {actor_jefe} (no producción).',
      'cierre', 'Cualquier consulta, respondé a este correo.',
      'footer', 'Orquesta Filarmónica de Río Negro – Sistema de Gestión'
    )
  )
ON CONFLICT (template_id, variant_key) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  asunto = EXCLUDED.asunto,
  slots = EXCLUDED.slots,
  updated_at = now();
