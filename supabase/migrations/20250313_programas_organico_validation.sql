-- Añadir campos de validación de instrumentación a la tabla programas
ALTER TABLE programas
ADD COLUMN IF NOT EXISTS organico_revisado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organico_comentario TEXT;

-- Comentarios para documentación del esquema
COMMENT ON COLUMN programas.organico_revisado IS 'Indica si el director ha validado las adaptaciones de instrumentación.';
COMMENT ON COLUMN programas.organico_comentario IS 'Descripción de las adaptaciones artísticas validadas para este programa.';
