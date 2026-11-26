-- Soft-cancel status for programas (giras). Isolated ALTER TYPE; do not use
-- the new enum value in the same transaction.
ALTER TYPE estado_gira ADD VALUE IF NOT EXISTS 'Cancelada';
