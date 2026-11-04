# Listado Giras personal: filtro server-side

## Problema

El listado (`useGirasList`) para rol `personal` / `consulta_personal` bajaba **todos** los programas del rango con nómina + eventos anidados y filtraba en el cliente. En celulares eso provocaba flash/blanco (presión de memoria) al entrar a Giras.

## Solución

1. RPC `list_programa_ids_visibles(integrante, desde, hasta, coord_ensamble_ids, incluir_ausente_con_abono)` — IDs visibles con la misma regla que el filtro JS previo (override / ENSAMBLE|FAMILIA|EXCL + membresía por `fecha_desde`).
2. Hydrate solo esos IDs con `GIRAS_LIST_SELECT_PERSONAL` (sin expandir toda la orquesta).
3. Year summary personal reusa la RPC (`incluir_ausente_con_abono = true`).
4. `GirasView` no pide el catálogo de ~500 integrantes si el usuario no puede crear/editar.

## Fuera de alcance

`useGiraRoster` / `fetchRosterForGira` **no** se mueve a SQL. El listado pregunta “¿este programa me aparece?”; el roster pregunta “quiénes están en esta gira”.

## Hecho

- [x] Migración `20261104140000_list_programa_ids_visibles.sql`
- [x] Rama personal en `useGirasList`
- [x] Year summary vía RPC
- [x] Skip `fetchIntegrantesList` para personal puro
