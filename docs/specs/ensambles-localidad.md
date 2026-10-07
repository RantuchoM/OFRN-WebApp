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

## Coordinación → Programas (visibilidad y convocados)

El coordinador de un ensamble (p. ej. ECAS) ve programas en `EnsembleCoordinatorView` (no el listado de `EnsemblesView.jsx`, que es el ABM de ensambles):

1. **Ensamble completo:** `giras_fuentes.tipo = ENSAMBLE` de su `id` y **sin** `EXCL_ENSAMBLE` de ese mismo id.
2. **Algunos integrantes:** al menos una persona de su ensamble figura en el roster de `fetchRosterForGira` / `useGiraRoster` (convocatoria por `FAMILIA`, otro ensamble, o fila en `giras_integrantes`). `estado === 'ausente'` no cuenta. `EXCL_ENSAMBLE` gana a FAMILIA/ENSAMBLE; un override en `giras_integrantes` (no ausente) **sí** entra, igual que en seating.

Ejemplo: gira **13** *La Fuerza del Legado* (Sinfónico, familias Cuerdas/Maderas/Bronces/Percusión, `EXCL_ENSAMBLE` ECAS). El coordinador ECAS la ve porque hay integrantes ECAS en `giras_integrantes` (confirmados). Un ensamble sin nadie en ese roster no la ve.

**Ensayos vs esa gira (universal, no solo ECAS):** si el ensamble/CF/familia está convocado y **no** hay EXCL → **Ensayo en conflicto** (en memoria: overlap + `giras_fuentes`; **sin** seating en Agenda). Si hay EXCL (o no se convocó ensamble/CF/familia) pero quedan personas en el roster de seating → **Tutti - N**, **solo** en Coordinación → Lista (`EnsayoTuttiMinusTag`), con **una** `fetchRosterForGira` por gira candidata (serie + memo). UnifiedAgenda no muestra Tutti-N ni dispara seating.

**Colocación del chip Tutti-N (Lista):** misma fila de metadatos inferior que el chip tradicional **Tutti** (junto a locación y chips de ensamble, p. ej. ECAS). No va en la fila del horario / tipo de evento (`ENSAYO ENSAMBLE`). El tag ámbar **Ensayo en conflicto** sí permanece en esa fila de cabecera.

**Tutti-N checkboxes (Lista):** tildar = esa persona **asiste igual al ensayo** a pesar de estar convocada a la gira. Default **destildado** (se espera en la gira, no en el ensayo). Persistido en `eventos_asistencia_custom.tipo = asiste_igual` (ID numérico de integrante). El formulario de ensayo no borra esas filas. Texto de ayuda: «Tildá si asiste igual al ensayo a pesar de estar convocado a la gira.»

Implementación: `fetchCoordinatorPrograms` en `src/utils/rehearsalProgramas.js` (query `useCoordinatorPrograms`). No usa `resolveGiraRosterIds`: mira `giras_fuentes` y filas presentes de `giras_integrantes` del ensamble. Desde 2026-10-07 el motor de Convocatorias/Servicios (`resolveGiraRosterForMatrix`) también conserva esa fila personal presente aunque haya `EXCL_ENSAMBLE`.

### Badge «Participan todos» / modal de personas

- Chip en la tarjeta (`ConvokedMembersBadge`): **Participan todos** solo si el roster filtrado incluye a **todos** los miembros activos del ensamble; si no, **Participa 1 persona** / **Participan n personas**.
- Personas = integrantes del ensamble del coordinador que están en el roster de **esa** gira (`useGiraRosterQuery` → `fetchRosterForGira`), IDs numéricos, `estado_gira !== 'ausente'`. No se infiere por «el ensamble está fuente».
- Clic abre modal portal a `document.body`, `z-[100]`, lista apellido, nombre (`seatingApellidoNombre`) e instrumento. Escape / clic fuera cierra.
