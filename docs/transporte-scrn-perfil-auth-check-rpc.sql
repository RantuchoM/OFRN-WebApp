-- Opcional: ayuda a la Edge create-scrn-perfil a saber si el uuid ya está en auth.users
-- (misma instancia de Postgres que el FK) antes de insertar en scrn_perfiles.
-- Ejecutar en Supabase SQL Editor una vez (o como migración).

CREATE OR REPLACE FUNCTION public.scrn_auth_user_id_in_db(p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_id);
$$;

REVOKE ALL ON FUNCTION public.scrn_auth_user_id_in_db(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scrn_auth_user_id_in_db(uuid) TO service_role;

COMMENT ON FUNCTION public.scrn_auth_user_id_in_db(uuid) IS
  'Usado por Edge create-scrn-perfil: comprobar visibilidad en auth.users antes del INSERT en scrn_perfiles.';
