-- FIMBA: usuarios externos por edición (mail + rol_fimba).
-- Staff OFRN (isManagement) no se registra aquí: acceso directo.
-- Seguridad v1: anon key + auth a nivel app (misma política que resto FIMBA).

CREATE TABLE IF NOT EXISTS public.fimba_usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mail text NOT NULL,
  clave_acceso text,
  rol_fimba text NOT NULL
    CONSTRAINT fimba_usuarios_rol_chk
      CHECK (rol_fimba = ANY (ARRAY['editor_general'::text, 'consulta'::text])),
  id_edicion bigint NOT NULL
    REFERENCES public.fimba_ediciones (id) ON DELETE CASCADE,
  nombre text,
  activo boolean NOT NULL DEFAULT true,
  token_login uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Un mail por edición (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS fimba_usuarios_mail_edicion_uidx
  ON public.fimba_usuarios (lower(mail), id_edicion);

CREATE INDEX IF NOT EXISTS fimba_usuarios_id_edicion_idx
  ON public.fimba_usuarios (id_edicion);

CREATE INDEX IF NOT EXISTS fimba_usuarios_mail_idx
  ON public.fimba_usuarios (lower(mail));

CREATE UNIQUE INDEX IF NOT EXISTS fimba_usuarios_token_login_uidx
  ON public.fimba_usuarios (token_login)
  WHERE token_login IS NOT NULL;

COMMENT ON TABLE public.fimba_usuarios IS
  'Usuarios FIMBA externos (no OFRN management). Acceso por edición: editor_general | consulta.';
COMMENT ON COLUMN public.fimba_usuarios.clave_acceso IS
  'Clave temporal / invitación. Auth app-level v1 (no hash Supabase Auth).';
COMMENT ON COLUMN public.fimba_usuarios.rol_fimba IS
  'editor_general = staff de esa edición; consulta = solo lectura (v1: enum listo, UI limitaba).';
COMMENT ON COLUMN public.fimba_usuarios.token_login IS
  'UUID opcional para magic-link futuro / alternativa a clave.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fimba_usuarios TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
