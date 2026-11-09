# Plantillas de mails (Gestión)

## Objetivo

Permitir a editores/admins editar **solo textos** (asunto + slots) de todos los templates de `mails_produccion` desde **Gestión → Plantillas de mails**, con placeholders (`{nombre}`, `{gira}`, `{titular}`, …). El layout HTML permanece en la Edge Function; **no hace falta redeploy** al guardar.

## Modelo

- Tabla `public.mail_plantillas` (`template_id`, `variant_key`, `titulo`, `asunto`, `slots` jsonb, `updated_at`, `updated_by`).
- Unique `(template_id, variant_key)`.
- Seed inicial desde defaults de [`src/utils/mailPlantillaSchemas.js`](../../src/utils/mailPlantillaSchemas.js).
- **Sin RLS** (patrón OFRN): `DISABLE ROW LEVEL SECURITY` + grants a `authenticated` / `anon` / `service_role`. Migraciones: `20261109120000_mail_plantillas.sql`, `20261109123000_mail_plantillas_disable_rls.sql`.

## Runtime

1. Caller envía `templateId` + `detalle` (y opcional `plantilla_variant` + vars).
2. [`mails_produccion`](../../supabase/functions/mails_produccion/index.ts) carga la fila, interpola placeholders y aplica slots (motivo, lead, cierres, asunto).
3. Si no hay fila → fallback a textos hardcodeados previos.

Convocatoria/roster: [`convocatoriaNotificationSend.js`](../../src/utils/convocatoriaNotificationSend.js) + `GiraRoster` pasan `plantillaVariant` (ej. `ALTA:cobertura`, `BAJA:balance`) y `vars` en lugar del copy fijo.

## UI

- Sección `plantillas_mails` en [`ManagementView.jsx`](../../src/views/Management/ManagementView.jsx).
- Hub: [`MailPlantillasHub.jsx`](../../src/views/Management/MailPlantillasHub.jsx) — categorías primero, búsqueda global de palabra, edición in-body con toolbar (negrita/cursiva/subrayado/color), chips de placeholders, Guardar / Defaults.
- Familias en `MAIL_PLANTILLA_FAMILIAS`: convocatoria, **giras**, viáticos, repertorio, acceso, constancias, otros.
- `cambio_fechas_gira` vive en familia **giras** (no repertorio).
- Preview estructural (no editable): en plantillas de repertorio se muestran quién carga/asigna y los campos de obra (`{titulo}`, `{compositores}`, Drive, etc.) como en el mail real; en convocatoria/cambio de fechas, bloque de fechas/zona.
- Servicio: [`mailPlantillasService.js`](../../src/services/mailPlantillasService.js).

## Fuera de alcance

- Editor de layout/CSS.
- Historial de versiones (solo `updated_at` / `updated_by`).
- Borradores / publicación diferida (guardar = vivo).

## Checklist

- [x] Migración + seed aplicados en linked
- [x] Schemas + CRUD
- [x] EF lee DB e interpola
- [x] Hub en Gestión
- [x] Callers convocatoria/roster con vars
- [x] Spec
- [x] `cambio_fechas_gira` en familia giras
- [x] Preview estructural obra/cargador en repertorio
