# Spec: Instrumento por gira (`giras_integrantes.id_instr`)

## Objetivo
Permitir elegir qué instrumento toca cada músico en una gira concreta, sin modificar su ficha (`integrantes.id_instr`). El instrumento efectivo alimenta roster, Seating y auditoría de instrumentación.

## Modelo de datos

| Campo | Tabla | Uso |
|-------|-------|-----|
| `id_instr` | `integrantes` | Instrumento de ficha (sin cambios) |
| `id_instr` | `giras_integrantes` | Override nullable FK → `instrumentos.id` |

**Regla:** instrumento efectivo = `giras_integrantes.id_instr ?? integrantes.id_instr`.

Migración: `supabase/migrations/20260618120000_giras_integrantes_id_instr.sql`

## Motor de roster (`useGiraRoster`)

- [x] Leer `id_instr` de `giras_integrantes` en el override map.
- [x] Cargar catálogo `instrumentos` (id, instrumento, familia, plaza_extra, rol_gira_default).
- [x] Normalizar cada fila con `applyEffectiveGiraInstrument()`:
  - `id_instr_perfil` — valor de ficha
  - `id_instr_gira_override` — override explícito o `null`
  - `id_instr` + `instrumentos` — valores **efectivos** para consumidores downstream

**Convocatoria por familia (`giras_fuentes` FAMILIA):** sigue usando `integrantes.id_instr` → `instrumentos.familia`. El override no cambia quién entra al roster.

## UI — GiraRoster

- [x] Desplegable de instrumento en columna «Rol / Instr.» (`RosterTableRow`), catálogo completo.
- [x] Si el valor elegido coincide con la ficha, se guarda `id_instr = null` (sin override).
- [x] Override activo: texto indigo + tooltip con instrumento de ficha.
- [x] `changeInstrument` → upsert en `giras_integrantes` vía `buildGiraIntegranteUpsert`.

## Consumidores (sin cambio de lógica si usan roster normalizado)

- [x] `ProgramSeating` — split cuerdas/vientos, particellas, badges
- [x] `InstrumentationAudit` / `InstrumentationBadges` — conteo Convoked
- Exportaciones de roster que lean `m.instrumentos` / `m.id_instr`

## Helpers (`giraUtils.js`)

- `getProfileInstrumentId`, `getGiraInstrumentOverrideId`, `getEffectiveInstrumentId`
- `resolveInstrumentFromCatalog`, `applyEffectiveGiraInstrument`
- `buildGiraIntegranteUpsert` — preserva override en upserts de rol/estado

## Fuera de alcance

- Multi-instrumento en ficha del integrante
- Restricción del desplegable a «sus» instrumentos (catálogo completo)

## Deuda técnica

| Ítem | Estado |
|------|--------|
| `MusiciansView.handleMassUpdate` con `parseInt` en `id_instr` (códigos texto `01`–`04`) | [x] Corregido: `id_instr` se guarda como string |
| Matriz de asistencia / export: instrumento de ficha sin override por gira | [x] `fetchAsistenciaMatrixBaseData` carga overrides; `buildMatrixIntegranteInstrumentDisplay` enriquece filas visibles |
| Lógica `computeConvoked` duplicada en 3 archivos | Pendiente (refactor opcional) |
| `EnsemblesView` y otras vistas globales de integrantes | Fuera de alcance: no son contexto de gira |
