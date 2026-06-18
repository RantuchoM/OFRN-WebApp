# Uso de URL para las pestañas de Gira (OFRN)

La aplicación usa **query params** en la ruta raíz (`/`) para abrir la pestaña "Giras" y, opcionalmente, una gira concreta y una vista interna. No se usan rutas tipo `/giras/agenda/:id` ni `/giras/repertoire/:id`.

## Parámetros

| Parámetro | Valores | Descripción |
|-----------|--------|-------------|
| `tab` | `giras` | Activa la pestaña principal "Giras". |
| `giraId` | ID numérico (ej. `2`) | ID del programa/gira seleccionado. Obligatorio para ver Agenda, Repertorio, etc. |

### Deep-link desde Ctrl+K (giras pasadas)
El listado de Giras filtra por rango de fechas (hoy → fin de año). Las giras anteriores no aparecen en la lista pero sí en **Historial de Giras** (Ctrl+K).

Al navegar con `giraId` que no está en el listado filtrado, `GirasView` carga el programa completo vía `fetchProgramsByIds` (`useGirasList.js`) y lo usa como `selectedGira`. Desde Ctrl+K el destino por defecto es `view=ROSTER` (management) o `view=AGENDA` (personal).
| `view` | Ver tabla abajo | Vista interna dentro de la gira. |
| `subTab` | (según vista) | Subvista; por ejemplo en Logística: `rooming`, etc. |

## Valores de `view`

| Valor | Descripción |
|-------|-------------|
| (omitido o `LIST`) | Listado de programas/giras. |
| `AGENDA` | Agenda de la gira. |
| `REPERTOIRE` | Repertorio de la gira. |
| `ROSTER` | Nómina / Personal. |
| `LOGISTICS` | Logística (transportes, alojamiento, etc.). |
| `MEALS_PERSONAL` | Mis Comidas. |
| `SEATING` | Disposición de atriles. |
| `DIFUSION` | Difusión. |
| `EDICION` | Edición del programa (GiraForm). |

## Ejemplos de URL

- Listado de giras (solo pestaña Giras):  
  `/?tab=giras`

- Misma pestaña con una gira preseleccionada (por ID):  
  `/?tab=giras&giraId=2`

- **Agenda** de la gira 2:  
  `/?tab=giras&view=AGENDA&giraId=2`

- **Repertorio** de la gira 2:  
  `/?tab=giras&view=REPERTOIRE&giraId=2`

- Nómina de la gira 2:  
  `/?tab=giras&view=ROSTER&giraId=2`

- Logística de la gira 2 (con subvista opcional):  
  `/?tab=giras&view=LOGISTICS&giraId=2`  
  `/?tab=giras&view=LOGISTICS&giraId=2&subTab=rooming`

- Edición del programa 2:  
  `/?tab=giras&view=EDICION&giraId=2`

## Cómo navegar desde código

### Con `useNavigate` (React Router)

```js
const navigate = useNavigate();
const giraId = 2;

// Ir a la agenda de la gira
navigate({ pathname: "/", search: `?tab=giras&view=AGENDA&giraId=${giraId}` });

// Ir al repertorio de la gira
navigate({ pathname: "/", search: `?tab=giras&view=REPERTOIRE&giraId=${giraId}` });
```

### Con `setSearchParams` (dentro de la app ya en Giras)

```js
setSearchParams({ tab: "giras", view: "REPERTOIRE", giraId: String(giraId) });
```

### Enlaces externos (copiar/pegar o compartir)

Construir la URL absoluta con el origen actual:

```js
const url = `${window.location.origin}${window.location.pathname}?tab=giras&view=AGENDA&giraId=${giraId}`;
```

## Dónde se usa

- **Tarjetas de programas (Coordinación)**: `ProgramCardItem` en `EnsembleCoordinatorView.jsx` — botones "Ver Agenda" y "Ver Repertorio" usan `navigate({ pathname: "/", search: "?tab=giras&view=AGENDA&giraId=…" })` y análogo para `REPERTOIRE`.
- **GirasView.jsx**: Lee `searchParams.get("view")`, `searchParams.get("giraId")` y muestra la vista correspondiente; actualiza la URL con `setSearchParams` / `updateView`.
- **GiraRoster.jsx**: Genera enlace al repertorio con `?tab=giras&view=REPERTOIRE&giraId=…`.
- **RepertoireView.jsx**: Navega a repertorio de una gira con `setSearchParams({ tab: "giras", view: "REPERTOIRE", giraId })`.
- **App.jsx**: Sincroniza `tab` y `giraId` con el estado global de pestaña activa.

## Título de pestaña del navegador

- [x] El título de la pestaña (`document.title`) se actualiza dinámicamente según la sección activa.
- Implementación: `src/utils/documentTitle.js` + `src/hooks/useDocumentTitle.js`, integrado en `App.jsx`.
- Formato: `{sección} · {contexto opcional} · OFRN` (ej. `Rooming · Festival de Verano · OFRN`, `Gestión · OFRN`, `Espacios · Gestión · OFRN`).
- En giras con `giraId`, el nombre se obtiene de `programas.nombre_gira` (con caché en memoria por sesión).
- Rutas públicas (`/entradas`, `/viaticos-manual`, etc.) y login tienen títulos propios vía el mismo hook.

## Resumen anual en listado (GirasView LIST)

- [x] Al final del listado de programas (cuando el filtro de fecha llega al 31/12 del año en curso), se muestra un cuadro horizontal con estadísticas del año.
- **Programas por tipo**: cuenta solo los programas en los que el integrante está convocado (filtro personal: ensamble/familia/nómina), entre el 1/ene y el 31/dic del año en curso — **sin** ampliar por rol editor ni por ensambles coordinados.
- **Ensayos de ensamble convocados**: solo para usuarios integrante (no invitados). Cuenta eventos `id_tipo_evento = 13`, no técnicos, no eliminados, en el año en curso, donde el músico está convocado (membresía activa en el ensamble del evento ± overrides `eventos_asistencia_custom`).
- Implementación: `GirasYearSummaryBar.jsx`, `useGirasYearSummary.js`, `girasYearSummary.js`.
- Visible solo en `mode === LIST` y cuando `filterDateEnd >= endOfCurrentYearLocal()`.

## Resumen

- **Ruta base**: siempre `/` (raíz).
- **Agenda de la gira**: `/?tab=giras&view=AGENDA&giraId=<id>`.
- **Repertorio de la gira**: `/?tab=giras&view=REPERTOIRE&giraId=<id>`.
- No usar rutas como `/giras/agenda/:id` ni `/giras/repertoire/:id`; no están implementadas.
