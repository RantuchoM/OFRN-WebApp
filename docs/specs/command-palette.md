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
1. **Contexto actual** — vistas de la gira, repertorio, ensambles o gestión según URL activa
2. **Acciones locales** — registradas por componentes vía `useCommandPalette`
3. **General / Gestión / Ayuda** — navegación global filtrada por rol
4. **Informes de Gestión** — un comando por informe (`/management/{slug}`)
5. **Historial de Giras** — acceso directo a programas desde DB

Personas y repertorio no son comandos de la lista. Se entra con el selector de arriba (Tab). Al abrir Ctrl+K no hay fetch de `obras` ni `integrantes`.

## Contexto de gira (`?tab=giras` + `giraId`)
Aparecen solo con una gira en la URL. **Management** ve la sección *Gira (Gestión)* (mismo patrón que `GiraActionMenu`). **Sin atajo propio** (se llega con Ctrl/Cmd+K).

Al escribir, si el texto coincide, estos comandos salen **antes** que «Ir a…», el historial de otras giras y el resto. Dentro de la gira se sigue ordenando por relevancia (`reper` deja primero *Programación y Repertorio*, no Roster).

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
| Concerto Competition | `/?tab=competition` | admin o editor, o músico del electorado en una edición visible (`musicianCanSeeConcerto`) |
| Traducción musical | `/?tab=music_translation` | lista blanca (`musicTranslationAccess`) |
| Manual de Usuario | `/?tab=manual` | No invitado + personal/editor/management |
| Feedback | `/?tab=feedback` | No invitado |
| FIMBA | `/fimba` | `isManagement` (pie del sidebar) |
| Entradas | `/entradas` | pie del sidebar, también invitado |

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
| Gestión: Servicios | `/management/servicios` |
| Gestión: Conciertos | `/management/conciertos` |
| Gestión: Audiencia | `/management/audiencia` |
| Gestión: Seguimiento viáticos | `/management/viaticos_seguimiento` |

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
- [x] Búsqueda del paleta: tokens AND, sin tildes/mayúsculas (`matchesMultiTokenSearch`; spec `docs/specs/busqueda-texto.md`). Con `giraId` en la URL, los comandos de esa gira que coinciden van antes que General e Historial.
- [x] Pestaña Comandos: historial y comandos de la gira abierta coinciden por `mes_letra` y `nomenclador` (`09b`, `Sinf 12/26`, `09b | Sinf 12/26`). El rótulo del historial es `mes_letra | nomenclador. nombre`.
- [x] **Personas / repertorio por Tab** (sin prefetch del catálogo al abrir Ctrl+K), abriendo `MusicianForm` / `WorkForm`. No hay ítems «Buscar personas» ni «Buscar repertorio» en la lista. Tokens cruzan campos (`Tchai Ele` → Elegy + Tchaikovsky) y no distinguen tildes (`Garcia` → García). En personas, WhatsApp y mail se abren desde la fila.
- [x] **Gira: Escenario** en contexto de gira (management), misma URL que menú Gira → Escenario
- [x] **Tab cambia de vista** (Comandos / Personas / Repertorio) con selector visible; no mueve el foco a los resultados
- [x] **Concerto Competition**, **FIMBA** y **Entradas** en Ctrl+K, con la misma visibilidad que el sidebar

## Búsqueda de obras y personas (dos pasos, sin volcar tablas)

**Al abrir la paleta (Ctrl/Cmd+K o el botón de la barra) no se consulta `obras` ni `integrantes`.** Solo se listan comandos ya registrados (navegación, contexto, historial de giras). No hay diferencia “ínfima”: un catálogo de miles de obras no entra en memoria al pulsar Ctrl+K.

### Cómo se usa
1. Abrir la paleta. La lista es de comandos (navegación, contexto, giras). No incluye «Buscar personas» ni «Buscar repertorio». En Comandos, cada gira del historial se busca también por `mes_letra` y `nomenclador` (`09b`, `Sinf 12/26` o `09b | Sinf 12/26`). Si esa gira está abierta, sus comandos (Programación, Seating, etc.) coinciden con esos mismos códigos y quedan primero.
2. **Tab** (o el segmento de arriba) pasa a Personas o Repertorio. Recién ahí se escribe. A los **2+ caracteres**, con debounce **250 ms**, cada token se busca solo (título **o** compositor; en personas, nombre **o** instrumento; tope 20 por token). El filtro de Postgres es `~*` con clases de acentos, así `Garcia` encuentra *García* y `Jose` encuentra *José*. El AND entre palabras lo hace el ranking cliente sobre los campos juntos, igual que la búsqueda rápida del repertorio móvil: `Tchai Ele` encuentra *Elegy* de Tchaikovsky. No se descarga la tabla completa.
3. Elegir un resultado abre la ficha: `WorkForm` (`z-[9999]`) o `MusicianForm` (id numérico, `z-[100]`). En personas, si hay teléfono o mail, la fila muestra **WhatsApp** (`wa.me`, con el mismo normalizado que el resto de la app) y **mail** (`mailto:`). Un clic en esos iconos no abre la ficha. ESC limpia el texto y, si ya está vacío, vuelve a comandos; ESC de nuevo cierra.

### Alternar las tres vistas con Tab

Con la paleta abierta, **Tab** avanza y **Shift+Tab** retrocede: **Comandos → Personas → Repertorio**, solo entre las vistas que el rol puede ver. El texto escrito se conserva y se busca en la vista nueva.

El cambio es visual, no un salto de foco:

- Un selector de segmentos queda arriba del input. La vista activa se pinta (índigo / esmeralda / violeta), igual que la franja superior y la fila marcada.
- Tab se captura en fase capture y los resultados tienen `tabIndex={-1}`, así que no enfoca el primer ítem.
- El hover solo mueve la selección si el puntero realmente se movió. Un cursor quieto sobre la lista no pisa la fila marcada cuando la vista cambia.

| Modo | Qué busca | Al elegir |
|------|-----------|-----------|
| **Buscar repertorio** | Título, compositor/arreglador o id numérico | `WorkForm` con `{ id }`, `context="archive"` |
| **Buscar personas** | Nombre, apellido, preferencia, instrumento o id numérico | `MusicianForm` con id **INT** de `integrantes` (nunca UUID) |

Visibilidad de las pestañas Personas y Repertorio (misma regla que «Ir a Repertorio» / «Ir a Personas»):

- Obras: no invitado + archivista / editor / management / arreglador
- Personas: management o director

Vacantes (`es_simulacion = true`) **no** aparecen. Un cache global de la fila, si existiera, solo se reutilizaría **al abrir el id elegido**; nunca se precarga el padrón al montar la paleta.

Iconos solo de `Icons.jsx`. Paleta `z-[200]`; comandos de navegación intactos.
