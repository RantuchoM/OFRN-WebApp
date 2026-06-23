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
