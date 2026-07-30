# Spec: Localidad de ensamble

## Objetivo

Asociar cada ensamble a una localidad (tabla `localidades`) como sede/base del grupo.

## Modelo de datos

- Tabla: `public.ensambles`
- Columna: `id_localidad bigint NULL` → FK `localidades(id)` ON DELETE SET NULL
- Migración: `supabase/migrations/20260623120000_ensambles_id_localidad.sql`

## UI

- [x] **Ensambles** (`EnsemblesView.jsx`): selector de localidad al editar cabecera del ensamble; lectura en panel y listado lateral.
- [x] **Datos** (`DataView.jsx` → `UniversalTable`): columna `id_localidad` editable en pestaña Ensambles.
- [x] En el listado de integrantes vigentes, la tarjeta es informativa: la baja solo se carga desde el control **Cargar baja** o editando su fecha, nunca al hacer clic en el resto de la tarjeta.
- [x] Misma UX de baja (`BajaDateField` + `BajaDateModal` en `BajaDateControls.jsx`) en ficha de músico: membresías de ensamble (`EnsembleMembershipEditor`) y **Sistema → Fecha Baja** (`MusicianDocsSection`). El ícono de basura en membresías solo elimina el tramo (con `ConfirmDialog`), no carga baja.
- [x] Al cargar **Sistema → Fecha Baja**, el modal ofrece cerrar también todas las membresías de ensamble abiertas usando exactamente la misma fecha. La opción viene **tildada por defecto** (se puede destildar) y valida que la baja no sea anterior al alta de ningún tramo.
