-- Refactor: es_tipo_alternativo -> categoria_logistica (PASAJEROS | LOGISTICO | INTERNO)
-- Nuevo tipo de evento 35: Traslado Interno (violeta, categoría 3)

-- 1. Asegurar que el nuevo tipo de evento (35) exista para Traslado Interno
INSERT INTO tipos_evento (id, nombre, color, id_categoria)
VALUES (35, 'Traslado Interno', '#8B5CF6', 3)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  color = EXCLUDED.color;

-- 2. Añadir la nueva columna de categoría a la tabla de transportes
ALTER TABLE giras_transportes ADD COLUMN IF NOT EXISTS categoria_logistica text DEFAULT 'PASAJEROS';

-- 3. Migrar datos: booleano antiguo -> enum
-- true -> LOGISTICO
-- false -> PASAJEROS
UPDATE giras_transportes
SET categoria_logistica = 'LOGISTICO'
WHERE es_tipo_alternativo = true;

UPDATE giras_transportes
SET categoria_logistica = 'PASAJEROS'
WHERE es_tipo_alternativo = false OR es_tipo_alternativo IS NULL;

-- 4. (Opcional) Tras verificar en producción, descomentar:
-- ALTER TABLE giras_transportes DROP COLUMN es_tipo_alternativo;
