-- Cuentas protegidas: no se pueden eliminar ni cambiar roles/email desde la app.
-- Mantener sincronizado con src/utils/protectedIntegrantes.js

CREATE OR REPLACE FUNCTION public.integrantes_is_protected_email(p_mail text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_mail, ''))) = ANY (
    ARRAY['ofrn.archivo@gmail.com']::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.integrantes_protect_owner_accounts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.integrantes_is_protected_email(OLD.mail) THEN
      RAISE EXCEPTION 'No se puede eliminar esta cuenta protegida.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF public.integrantes_is_protected_email(OLD.mail) THEN
      IF NEW.rol_sistema IS DISTINCT FROM OLD.rol_sistema THEN
        RAISE EXCEPTION 'No se pueden modificar los roles de esta cuenta protegida.';
      END IF;
      IF lower(trim(coalesce(NEW.mail, ''))) IS DISTINCT FROM lower(trim(coalesce(OLD.mail, ''))) THEN
        RAISE EXCEPTION 'No se puede cambiar el email de esta cuenta protegida.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integrantes_protect_owner_accounts ON public.integrantes;

CREATE TRIGGER integrantes_protect_owner_accounts
  BEFORE UPDATE OR DELETE ON public.integrantes
  FOR EACH ROW
  EXECUTE PROCEDURE public.integrantes_protect_owner_accounts();
