# Command Palette (Ctrl+K)

## Objetivo
Menú de navegación rápida accesible con **Ctrl+K** (o **Cmd+K** en macOS) y desde el botón de la barra superior.

## Archivos
| Archivo | Rol |
|---------|-----|
| `src/context/CommandPaletteContext.jsx` | Registro de comandos globales, contextuales, de giras y apertura de fichas |
| `src/components/ui/CommandPalette.jsx` | UI modal (portal a `document.body`, `z-[200]`) con búsqueda |
| `src/components/ui/CommandPaletteEntityOverlays.jsx` | Portales de `WorkForm` (`z-[9999]`) y `MusicianForm` (`z-[100]`) |
| `src/utils/commandPaletteEntitySearch.js` | Búsqueda limitada de obras e integrantes (ilike + ranking cliente) |
| `src/components/ui/CommandBarTrigger.jsx` | Botón que dispara `open-command-palette` |
| `src/constants/managementPalette.js` | **Fuente de verdad** para rutas de informes de Gestión en Ctrl+K |

## Secciones del menú
1. **Búsqueda** — comandos `Buscar personas` / `Buscar repertorio` (entrada al buscador lazy; **no** hay fetch al abrir Ctrl+K)
2. **Contexto actual** — vistas de la gira, repertorio, ensambles o gestión según URL activa
3. **Acciones locales** — registradas por componentes vía `useCommandPalette`
4. **General / Gestión / Ayuda** — navegación global filtrada por rol
5. **Informes de Gestión** — un comando por informe (`/management/{slug}`)
6. **Historial de Giras** — acceso directo a programas desde DB

## Contexto de gira (`?tab=giras` + `giraId`)
Aparecen solo con una gira en la URL. **Management** ve la sección *Gira (Gestión)* (mismo patrón que `GiraActionMenu`). **Sin atajo propio** (se llega con Ctrl/Cmd+K).

| Comando | URL |
|---------|-----|
| Gira: Dashboard / Resumen | `/?tab=giras&view=RESUMEN&giraId={id}` |
| Gira: Roster (Personas) | `/?tab=giras&view=ROSTER&giraId={id}` |
| Gira: Agenda Detallada (Gestión) | `/?tab=giras&view=AGENDA&giraId={id}` |
| Gira: Programación y Repertorio | `/?tab=giras&view=REPERTOIRE&giraId={id}` |
| Gira: Seating | `/?tab=giras&view=REPERTOIRE&giraId={id}&subTab=seating` (Disposición; sin `seatingView` o `disposicion`) |
| Gira: Escenario | `/?tab=giras&view=REPERTOIRE&giraId={id}&subTab=seating&seatingView=escenario` — mismo destino que menú Gira → Repertorio → Escenario (`buildEscenarioEditorTo`) |
| Gira: Difusión y Prensa | `/?tab=giras&view=DIFUSION&giraId={id}` |
| Gira: Panel Logístico | `/?tab=giras&view=LOGISTICS&giraId={id}` |
| Gira: Gestión de Viáticos | `/?tab=giras&view=LOGISTICS&giraId={id}&subTab=viaticos` |
| Logística > Resumen / Transportes / Comidas / Asistencia / Hotelería | `view=LOGISTICS` + `subTab` correspondiente |

Icono de Escenario: `IconLayout` (`Icons.jsx`), igual que el ítem del menú ⋮. No es una página nueva: es el tab Escenario de `ProgramSeating`.

- [x] Escenario en Ctrl+K con gira en contexto (2026-09-24)

## Vistas de App en Ctrl+K
Los comandos globales replican la visibilidad del sidebar (`App.jsx` → `allMenuItems`):

| Comando | URL | Visibilidad |
|---------|-----|-------------|
| Dashboard | `/?tab=dashboard` | `isManagement` o rol `director` |
| Panel de Giras | `/?tab=giras` | Todos |
| Agenda General | `/?tab=agenda` | No invitado + personal/editor/management |
| Difusión | `/?tab=difusion` | admin, editor o difusión |
| Repertorio | `/?tab=repertorio` | No invitado + archivista/editor/management |
| Arreglos | `/?tab=arreglos` | admin, arreglador o acceso especial |
| Ensambles | `/?tab=ensambles` | management |
| Coordinación | `/?tab=coordinacion` | coordinador de ensamble (rol o tabla) |
| Personas | `/?tab=musicos` | management o director |
| Datos | `/?tab=datos` | management sin rol difusión |
| Curaduría | `/?tab=curadoria` | admin o curador |
| Comunicación | `/?tab=news_manager` | management |
| Editor Manual | `/?tab=manual_admin` | management |
| Usuarios | `/?tab=usuarios` | admin |
| Traducción musical | `/?tab=music_translation` | lista blanca (`musicTranslationAccess`) |
| Manual de Usuario | `/?tab=manual` | No invitado + personal/editor/management |
| Feedback | `/?tab=feedback` | No invitado |

## Informes de Gestión — acceso individual
Cada informe tiene **su propia entrada** en Ctrl+K y **su propia ruta** bajo `/management`.

| Comando Ctrl+K | Ruta |
|----------------|------|
| Gestión: Menú de informes | `/management` |
| Gestión: Espacios | `/management/venues` |
| Gestión: Informes Seating | `/management/seating` |
| Gestión: Instrumentación | `/management/instrumentation` |
| Gestión: Convocatorias | `/management/convocatorias` |
| Gestión: Ensayos por programa | `/management/ensayos` |
| Gestión: Asistencia a ensayos | `/management/asistencia_ensayos` |
| Gestión: Conciertos | `/management/conciertos` |
| Gestión: Audiencia | `/management/audiencia` |

Visibilidad: `isAdmin` o `isEditor` (misma regla que el ítem **Gestión** del sidebar).

### Checklist para un informe nuevo
1. **`src/constants/managementPalette.js`** — añadir objeto con `slug`, `id`, `label`, `section`.
2. **`src/views/Management/ManagementView.jsx`** — registrar en `SECTION_CONFIG`, `SECTION_ORDER` y `DEFAULT_SECTIONS`; renderizar el componente en el branch del informe activo. El header usa **Menú de informes** + desplegable `ManagementReportPicker` (no fila de pestañas).
3. **`src/App.jsx`** — incluir el slug en `managementSections` si aplica filtro por perfil.
4. **`CommandPaletteContext.jsx`** — si el slug tiene icono propio, mapearlo en `MANAGEMENT_SECTION_ICONS`.
5. Actualizar esta spec y `docs/management-module-expansion.md`.

No hace falta duplicar la URL en más sitios: `buildManagementPaletteCommands()` lee `managementPalette.js` automáticamente.

## Estado de implementación
- [x] Vistas principales de App alineadas con sidebar
- [x] Informes de Gestión con ruta y comando propios
- [x] Fuente compartida `managementPalette.js`
- [x] Corrección ruta Usuarios (`/?tab=usuarios`, antes `configuracion`)
- [x] Coordinación con detección de coordinador de ensamble
- [x] Historial de giras: deep-link por `giraId` carga programa fuera del filtro de fechas y abre Roster (management) o Agenda (personal)
- [x] Búsqueda del paleta: tokens AND, sin tildes/mayúsculas (`matchesMultiTokenSearch`; spec `docs/specs/busqueda-texto.md`)
- [x] **Buscar personas / repertorio en dos pasos** (sin prefetch del catálogo al abrir Ctrl+K), abriendo `MusicianForm` / `WorkForm`
- [x] Ranking: `pers…` clava **Buscar personas**; `rep…` / `obra`/`obras` clava **Buscar repertorio** (por encima de «Ir a Personas/Repertorio»)
- [x] **Gira: Escenario** en contexto de gira (management), misma URL que menú Gira → Escenario

## Búsqueda de obras y personas (dos pasos, sin volcar tablas)

**Al abrir la paleta (Ctrl/Cmd+K o el botón de la barra) no se consulta `obras` ni `integrantes`.** Solo se listan comandos ya registrados (navegación, contexto, historial de giras). No hay diferencia “ínfima”: un catálogo de miles de obras no entra en memoria al pulsar Ctrl+K.

### Cómo se usa
1. Abrir la paleta.
2. Elegir **Buscar personas** o **Buscar repertorio** (arriba, sección *Búsqueda*). También aparecen **primero** al escribir `pers…`, `persona(s)`, `rep…`, `repertorio`, `obra` u `obras`. La paleta **sigue abierta** y pasa a modo búsqueda.
3. Recién ahí se escribe. A los **2+ caracteres**, con debounce **250 ms**, hay un `ilike` acotado (`applyMultiTokenOrIlike` + ranking cliente) con **límite 20**. No se descarga la tabla completa.
4. Elegir un resultado abre la ficha: `WorkForm` (`z-[9999]`) o `MusicianForm` (id numérico, `z-[100]`). ESC o ← vuelve a los comandos; ESC de nuevo cierra.

| Modo | Qué busca | Al elegir |
|------|-----------|-----------|
| **Buscar repertorio** | Título, compositor/arreglador o id numérico | `WorkForm` con `{ id }`, `context="archive"` |
| **Buscar personas** | Nombre, apellido, preferencia, instrumento o id numérico | `MusicianForm` con id **INT** de `integrantes` (nunca UUID) |

### Ranking de los comandos de búsqueda
`rankPaletteCommands` filtra con el scorer habitual **más alias**, y **pinnea al tope** si el query (≥ 3 caracteres) es prefijo de un alias o coincide exacto:

| Comando | Alias | Queries que lo clavan primero |
|---------|-------|-------------------------------|
| Buscar personas | `personas`, `persona` | `pers`, `perso`, `persona`, `personas` |
| Buscar repertorio | `repertorio`, `obras`, `obra` | `rep`, `reper…`, `repertorio`, `obra`, `obras` |

Así no quedan debajo de «Ir a Personas» / «Ir a Repertorio». Con 1–2 letras no se pinnea.

Visibilidad (misma regla que «Ir a Repertorio» / «Ir a Personas»):

- Obras: no invitado + archivista / editor / management / arreglador
- Personas: management o director

Vacantes (`es_simulacion = true`) **no** aparecen. Un cache global de la fila, si existiera, solo se reutilizaría **al abrir el id elegido**; nunca se precarga el padrón al montar la paleta.

Iconos solo de `Icons.jsx`. Paleta `z-[200]`; comandos de navegación intactos.
