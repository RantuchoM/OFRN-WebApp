-- DRAFT — NO EJECUTAR hasta que el usuario diga «implementar» / aplicar a DB.
-- Propósito: crear tipos_evento «Apertura de sala» y migrar eventos FIMBA
--            (gira 12 / edición 1) que hoy están como Concierto (id=1).
--
-- Confirmado (2026-09-02):
--   Categoría: Conciertos (id_categoria = 1) — NO Logística
--   Backline / Venues: SIN CAMBIO — siguen filtrando solo id_tipo_evento = 1
--     (Concierto). Al migrar a este tipo nuevo, las Aperturas salen
--     automáticamente de esas planillas; es el comportamiento deseado.
--
-- Hallazgos linked (2026-09-02):
--   Concierto = id 1, color #dc2626, id_categoria 1 (Conciertos)
--   «Apertura de sala» NO existe aún como tipo
--   Candidatos exactos gira 12 + tipo Concierto + detalle plain = «Apertura de sala»: 24
--   IDs: 4074,4075,4077,4079,4081,4084,4086,4088,4090,4091,4092,4093,
--        4096,4097,4098,4099,4100,4243,4250,4251,4299,4319,4320,4321
--   Conciertos vivos gira 12 hoy: 49 → quedarían 25 tras migrar
--   Falsos positivos si se usa solo ILIKE '%Apertura de sala%':
--     gira 1 (3, tipo NULL, «…/ingreso del público»), gira 2 (1 Audición)
--
-- Schema tipos_evento: id (IDENTITY BY DEFAULT), nombre NOT NULL,
--   color nullable default '#6366f1', id_categoria nullable.
--   NO hay columnas usa_transporte / orden en tipos_evento.
-- Schema categorias_tipos_eventos: id, nombre NOT NULL, created_at.
--
-- Impacto código (tras dejar de ser id_tipo_evento=1):
--   FIMBA Backline / Venues filtran .eq('id_tipo_evento', 1) → salen de esas planillas (OK)
--   Agenda filtra por id_categoria del tipo → siguen en Conciertos (id_categoria=1)
--
-- Opcional aún ambiguo (defaults abajo; no bloquean el draft):
--   Hex exacto del badge (propuesto #f59e0b; alt. rosa suave #fb7185)
--   Otras giras: por defecto NO migrar (solo gira 12 + match exacto)

BEGIN;

-- ── 1) Nuevo tipo ──────────────────────────────────────────────────────────
-- Categoría confirmada: Conciertos (1).
-- Color: ámbar #f59e0b — legible en categoría Conciertos y distinto del
--   rojo Concierto #dc2626. Alternativa rosa suave: #fb7185.
--   (Hex exacto sigue siendo opcional de confirmar antes de aplicar.)

INSERT INTO public.tipos_evento (nombre, color, id_categoria)
SELECT
  'Apertura de sala',
  '#f59e0b',
  1  -- Conciertos (confirmado)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tipos_evento t
  WHERE lower(btrim(t.nombre)) = 'apertura de sala'
);

-- ── 2) Migrar eventos (criterio estricto, solo FIMBA gira 12) ───────────────
-- Detalle = texto plano exacto «Apertura de sala» (case-insensitive, sin HTML).
-- NO incluye variantes «Apertura de sala/ingreso del público» ni menciones en
-- cuerpos largos (p.ej. audiciones). Otras giras fuera de alcance por defecto.

UPDATE public.eventos e
SET
  id_tipo_evento = t.id,
  updated_at = timezone('utc', now())
FROM public.tipos_evento t
WHERE lower(btrim(t.nombre)) = 'apertura de sala'
  AND e.id_gira = 12
  AND e.id_tipo_evento = 1
  AND COALESCE(e.is_deleted, false) = false
  AND lower(
    btrim(
      regexp_replace(
        regexp_replace(COALESCE(e.descripcion, ''), '<[^>]+>', '', 'g'),
        '&nbsp;',
        ' ',
        'gi'
      )
    )
  ) = 'apertura de sala';

-- ── 3) Verificación (dejar comentado o correr aparte) ──────────────────────
-- SELECT id, nombre, color, id_categoria FROM tipos_evento
-- WHERE lower(btrim(nombre)) = 'apertura de sala';
--
-- SELECT count(*) FROM eventos
-- WHERE id_gira = 12
--   AND id_tipo_evento = (SELECT id FROM tipos_evento WHERE lower(btrim(nombre)) = 'apertura de sala');
-- -- esperado: 24
--
-- SELECT count(*) FROM eventos
-- WHERE id_gira = 12 AND id_tipo_evento = 1 AND COALESCE(is_deleted,false)=false;
-- -- esperado: 25

-- ROLLBACK;  -- descomentar para dry-run seguro
COMMIT;
