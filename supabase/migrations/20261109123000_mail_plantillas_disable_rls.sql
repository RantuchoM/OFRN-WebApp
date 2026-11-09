-- OFRN: no usamos RLS restrictiva en tablas de gestión.
-- mail_plantillas quedó con RLS + policies solo authenticated/service_role;
-- el cliente falla al INSERT/UPSERT. Alineamos al patrón abierto del resto.

DROP POLICY IF EXISTS mail_plantillas_authenticated_all ON public.mail_plantillas;
DROP POLICY IF EXISTS mail_plantillas_service_role_all ON public.mail_plantillas;
DROP POLICY IF EXISTS mail_plantillas_anon_all ON public.mail_plantillas;

ALTER TABLE public.mail_plantillas DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_plantillas
  TO authenticated, anon, service_role;

GRANT USAGE, SELECT ON SEQUENCE public.mail_plantillas_id_seq
  TO authenticated, anon, service_role;
