# Listado Giras personal: filtro server-side

## Problema

El listado (`useGirasList`) para rol `personal` / `consulta_personal` bajaba **todos** los programas del rango con nómina + eventos anidados y filtraba en el cliente. En celulares eso provocaba flash/blanco (presión de memoria) al entrar a Giras.

## Solución

1. RPC `list_programa_ids_visibles(integrante, desde, hasta, coord_ensamble_ids, incluir_ausente_con_abono)` — IDs visibles con la misma regla que el filtro JS previo (override / ENSAMBLE|FAMILIA|EXCL + membresía por `fecha_desde`).
2. Hydrate solo esos IDs con `GIRAS_LIST_SELECT_PERSONAL` (sin expandir toda la orquesta).
3. Year summary personal reusa la RPC (`incluir_ausente_con_abono = true`).
4. `GirasView` no pide el catálogo de ~500 integrantes si el usuario no puede crear/editar.

## Cobertura (portal personal)

| Rol | Giras (listado) | Agenda general | Tag en `GiraCard` |
|---|---|---|---|
| Ausente **cubierto** (`cobertura_*`) | Sí (`programa_visible_para_integrante` siempre true si hay cobertura); tarjeta/fila grisácea (velo), tag a color | No (filtro `estado=ausente` en `useAgendaData`) | `Te cubre {nombre}` (rojo); sin acceso rápido a Agenda |
| Quien **cubre** (`es_cobertura`) | Sí (presente) | Sí | `Cubrís a {nombre}` (verde) |
| Ausente solo R/L | No en listado; sí en year summary con `incluir_ausente_con_abono` | No | — |

Migración `20261107121500_programa_visible_cobertura_listado.sql`. Enrich de labels en `useGirasList` → `gira.mi_cobertura` (tarjetas y vista Tabla). También en el fetch de **editores/admins** (`GIRAS_LIST_SELECT`): si el usuario logueado figura en la nómina como cubierto o cubridor, ve el mismo tag; si va **presente** (no ausente) sin cobertura, tag índigo **Asistís** (prioridad: Cubrís / Te cubre > Asistís). No se muestra en portal personal (listado ya filtrado a sus programas). Agenda del card solo se oculta en rol personal (`hideAgenda` + `isPersonal`).

## Fuera de alcance

`useGiraRoster` / `fetchRosterForGira` **no** se mueve a SQL. El listado pregunta “¿este programa me aparece?”; el roster pregunta “quiénes están en esta gira”.

## Hecho

- [x] Migración `20261104140000_list_programa_ids_visibles.sql`
- [x] Rama personal en `useGirasList`
- [x] Year summary vía RPC
- [x] Skip `fetchIntegrantesList` para personal puro
- [x] Cobertura: listado + tags + Agenda solo para quien cubre (`20261107121500`)
- [x] Editores/admins: tag **Asistís** si están presentes en la nómina
