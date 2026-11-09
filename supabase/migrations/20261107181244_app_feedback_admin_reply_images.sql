-- Imágenes adjuntas a la respuesta de administración (máx. 2, enforced en app).
ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS admin_reply_images text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.app_feedback.admin_reply_images IS
  'URLs públicas (Storage archivos_generales) de hasta 2 imágenes en la respuesta del admin.';
