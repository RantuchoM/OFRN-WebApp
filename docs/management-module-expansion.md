# Especificación Técnica: Módulo de Gestión Global (Admin/Editor)

## Objetivo
Centralizar herramientas de administración (Venues, Reportes de Seating) en un menú lateral independiente, accesible solo para roles con privilegios de edición.

## 1. Navegación (App.jsx)
- **Item de menú**: Se añade el ítem `Gestión` al sidebar principal (`ProtectedApp`), usando el icono `IconSettingsWheel`.
- **Visibilidad**: Solo se muestra si `user.rol_sistema` es `"admin"` o `"editor"`.
- **Ruta dedicada**: Se define la ruta `/management/*` en `App.jsx`, que renderiza `AppContent` con `initialTab="management"`, forzando el modo interno `"MANAGEMENT"`.
- **Modo interno**:
  - `tabToMode.management → "MANAGEMENT"`.
  - En `renderContent`, el modo `"MANAGEMENT"` devuelve `<ManagementView supabase={supabase} />`.

## 2. Componente `ManagementView`
Ruta: `src/views/Management/ManagementView.jsx`

- **Rol**: Layout principal del módulo de gestión.
- **Tabs internas**:
  1. **Espacios**:
     - Renderiza `VenuesManager` desde `src/components/management/VenuesManager.jsx`.
     - Reutiliza la UI de filtros y tabla de venues existente.
  2. **Informes Seating**:
     - Renderiza `SeatingReports` desde `src/views/Management/SeatingReports.jsx`.
- **Props**:
  - Recibe `supabase` desde `ProtectedApp` y lo propaga a los sub-módulos.

## 3. Informes de Seating (`SeatingReports`)
Ruta: `src/views/Management/SeatingReports.jsx`

### 3.1 Seguridad
- Solo accesible si `isEditor` o `isAdmin` desde `AuthContext`.
- Si el usuario no tiene permisos, se muestra un mensaje de acceso denegado.

### 3.2 Selector de Giras
- Consulta `programas` con `seating_contenedores!inner` para listar solo programas que tienen Seating guardado.
- Campos seleccionados:
  - `id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo`.
- Usa el componente `MultiSelect` (`src/components/ui/MultiSelect.jsx`) con opciones:
  - `id`: `programa.id`.
  - `label`: `"{mes_letra} | {nomenclador}. {nombre_gira}"`.
  - `subLabel`: `tipo` de programa.
  - `badgeClass`: clases devueltas por `giraUtils.getProgramTypeColor(tipo)`.
- **Colores**:
  - Se añade `getProgramTypeColor(type)` en `src/utils/giraUtils.js` que devuelve las clases Tailwind definidas en `PROGRAM_TYPES`.
  - `MultiSelect` soporta ahora un campo opcional `badgeClass` para colorear los chips seleccionados.

### 3.3 Histórico Global de Seating
- Botón: `Ver Histórico Global (Cuerdas)`.
- Al activarse:
  - Carga una sola vez el roster global de cuerdas desde `integrantes`:
    - `select("id, nombre, apellido, id_instr").in("id_instr", ["01","02","03","04"])`.
  - Abre `SeatingHistoryModal` (`src/components/seating/SeatingHistoryModal.jsx`) pasando:
    - `isOpen`, `onClose`, `roster` (lista global de cuerdas), `supabase`.
- El modal reutiliza su lógica existente para:
  - Paginar programas con Seating.
  - Mostrar la evolución de los atriles de cuerdas por programa a lo largo del tiempo.

### 3.4 Exportador Masivo

#### 3.4.1 Datos base compartidos
Para cada programa seleccionado:
- **Repertorio local**:
  - Se consulta `programas_repertorios`:
    - `id, nombre, orden, repertorio_obras (id, orden, excluir, obras (id, titulo, obras_compositores (rol, compositores (nombre, apellido))))`.
  - Se ordena `repertorio_obras` por `orden` para garantizar la secuencia musical correcta.
- **Roster de gira**:
  - Se reutiliza `fetchRosterForGira(supabase, programa)` desde `src/hooks/useGiraRoster.js`.
  - Devuelve el roster procesado (con `estado_gira`, `rol_gira`, `id_instr`, etc.), apto para PDF y Excel.

#### 3.4.2 PDFs de Seating (uno por programa)
- Acción: botón `Exportar PDFs Seleccionados`.
- Para cada programa seleccionado:
  - Se obtiene `localRepertorio` y `roster` como arriba.
  - Se llama a `generateSeatingPdf(supabase, programa, localRepertorio, roster)` desde `src/utils/seatingPdfExporter.js`.
  - Se descarga un PDF por programa con:
    - Tabla de disposición de cuerdas (contenedores/atriles).
    - Tabla de particellas para vientos y otros.
- Implementación actual:
  - Descarga múltiples PDFs (uno por gira seleccionada).
  - El empaquetado en ZIP puede añadirse en una iteración posterior usando una librería de archivado en el cliente.

#### 3.4.3 Excel Consolidado de Seating
- Acción: botón `Generar Excel Consolidado`.
- Para cada programa seleccionado:
  1. Carga `localRepertorio` y `roster`.
  2. Construye el estado de seating:
     - `seating_contenedores` + `seating_contenedores_items` (solo integrantes confirmados en la gira).
     - `seating_asignaciones`:
       - Llena un map `{ "C-{id_contenedor}-{id_obra}" → id_particella, "M-{id_musico}-{id_obra}" → id_particella }`.
     - `obras_particellas`:
       - Particellas por obra relevantes para el programa (chunking para evitar límites de consulta).
  3. Llama a:
     - `exportSeatingToExcel(supabase, programa, localRepertorio, roster, assignments, containers, particellas)` de `src/utils/seatingExcelExporter.js`.
  4. Descarga un archivo Excel por programa con:
     - Hoja `"Seating"` que incluye:
       - Tabla de disposición de cuerdas.
       - Tabla de asignación de particellas para vientos y otros.
- Nota:
  - Actualmente se genera un Excel por programa seleccionado.
  - Un Excel verdaderamente "consolidado" (múltiples programas en un solo Workbook) puede implementarse extendiendo el util de Excel en el futuro.

## 4. Refactor en `GirasView.jsx`

- Se elimina el acceso local al panel de venues dentro de Giras:
  - Se borra la importación:
    - `import { VenuesManager as VenuesManagementPanel } from "../../components/management/VenuesManager";`
  - Se elimina el botón de cabecera:
    - Bloque "Administración / Gestión General" que hacía `updateView("MANAGEMENT")`.
  - Se elimina la rama de renderizado:
    - `mode === "MANAGEMENT" && <VenuesManagementPanel ... />`.
- Resultado:
  - La gestión de venues deja de estar anclada a la vista de Giras y se centraliza únicamente en `ManagementView`.

## 5. Estilos y Componentes UI

- Se reutilizan patrones visuales existentes:
  - Layout de tarjetas y tablas (`bg-white`, `border-slate-200`, `rounded-xl`, `shadow-sm`).
  - Componentes de `src/components/ui/`:
    - `MultiSelect` para el selector de giras.
    - Iconos (`Icons.jsx`) para acciones de historial y exportación.
- Los colores de tipo de programa se centralizan en:
  - `PROGRAM_TYPES` y `getProgramTypeColor` en `giraUtils.js`.
  - Esto garantiza consistencia entre badges, filtros y etiquetas en todo el sistema.

