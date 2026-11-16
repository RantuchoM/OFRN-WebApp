-- pg_dump (rol ofrn_backup) necesita SELECT en sequences de public.
-- Tablas nuevas con REVOKE ALL FROM PUBLIC (p. ej. seating_jefe_marko_pendiente)
-- dejan la sequence sin privilegio y el dump horario falla.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ofrn_backup') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO ofrn_backup';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO ofrn_backup';
    EXECUTE 'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ofrn_backup';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ofrn_backup';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO ofrn_backup';
  END IF;
END
$$;
