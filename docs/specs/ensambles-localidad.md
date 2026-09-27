# Spec: Localidad de ensamble

## Objetivo

Asociar cada ensamble a una localidad (tabla `localidades`) como sede/base del grupo.

## Modelo de datos

- Tabla: `public.ensambles`
- Columna: `id_localidad bigint NULL` → FK `localidades(id)` ON DELETE SET NULL
- Migración: `supabase/migrations/20260623120000_ensambles_id_localidad.sql`
- Ya existían (sin UI): `id_familia text` → FK `familia(familia)`.
- N:N cameratas: tabla `ensambles_cf` (`id_ensamble` + `id_ensamble_cf`, ambos FK a `ensambles.id`). Migración `20260927003058_ensambles_cf.sql`: backfill desde el FK único `id_ensamble_cf` y se dropea esa columna. Jazz Band es camerata seleccionable junto a CFVal/CFMon/CFMar. El staff carga; no se siembran membresías.

## UI

- [x] **Ensambles** (`EnsemblesView.jsx`): selector de localidad, **familia** (`id_familia`) y **cameratas CF multi-select** (`ensambles_cf`: CFVal/CFMon/CFMar/Jazz Band, solo no-cameratas) al editar cabecera (portal z-[100]); lectura en panel.
- [x] **Datos** (`DataView.jsx` → `UniversalTable`): columna `id_localidad` editable en pestaña Ensambles.
- [x] En el listado de integrantes vigentes, la tarjeta es informativa: la baja solo se carga desde el control **Cargar baja** o editando su fecha, nunca al hacer clic en el resto de la tarjeta.
- [x] Misma UX de baja (`BajaDateField` + `BajaDateModal` en `BajaDateControls.jsx`) en ficha de músico: membresías de ensamble (`EnsembleMembershipEditor`) y **Sistema → Fecha Baja** (`MusicianDocsSection`). El ícono de basura en membresías solo elimina el tramo (con `ConfirmDialog`), no carga baja.
- [x] Al cargar **Sistema → Fecha Baja**, el modal ofrece cerrar también todas las membresías de ensamble abiertas usando exactamente la misma fecha. La opción viene **tildada por defecto** (se puede destildar) y valida que la baja no sea anterior al alta de ningún tramo.
