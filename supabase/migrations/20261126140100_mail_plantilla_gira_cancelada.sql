-- Soft-cancel mail variant (gira kept in DB; events hidden from cronograma).
INSERT INTO mail_plantillas (template_id, variant_key, titulo, asunto, slots)
VALUES
  (
    'convocatoria_gira',
    'GIRA_CANCELADA',
    'Gira cancelada',
    'Gira cancelada | {gira}',
    '{"titulo_interno":"Gira cancelada","lead":"Te informamos que la gira <strong>{gira}</strong> ha sido <strong>cancelada</strong> y ya no forma parte del cronograma.","cierre":"Si tenés consultas, contactá a la administración.","footer":"Orquesta Filarmónica de Río Negro – Sistema de Gestión"}'::jsonb
  )
ON CONFLICT (template_id, variant_key) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  asunto = EXCLUDED.asunto,
  slots = EXCLUDED.slots,
  updated_at = now();
