# Command Palette (Ctrl+K)

## Objetivo
Menú de navegación rápida accesible con **Ctrl+K** (o **Cmd+K** en macOS) y desde el botón de la barra superior.

## Archivos
| Archivo | Rol |
|---------|-----|
| `src/context/CommandPaletteContext.jsx` | Registro de comandos globales, contextuales y de giras |
| `src/components/ui/CommandPalette.jsx` | UI modal con búsqueda |
| `src/components/ui/CommandBarTrigger.jsx` | Botón que dispara `open-command-palette` |
| `src/constants/managementPalette.js` | **Fuente de verdad** para rutas de informes de Gestión en Ctrl+K |

## Secciones del menú
1. **Contexto actual** — vistas de la gira, repertorio, ensambles o gestión según URL activa
2. **Acciones locales** — registradas por componentes vía `useCommandPalette`
3. **General / Gestión / Ayuda** — navegación global filtrada por rol
4. **Informes de Gestión** — un comando por informe (`/management/{slug}`)
5. **Historial de Giras** — acceso directo a programas desde DB

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
2. **`src/views/Management/ManagementView.jsx`** — registrar en `SECTION_CONFIG`, `SECTION_ORDER` y `DEFAULT_SECTIONS`; renderizar el componente en el `switch` de pestañas.
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
