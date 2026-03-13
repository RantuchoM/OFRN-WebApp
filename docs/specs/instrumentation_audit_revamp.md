# Spec: Revamp de Auditoría de Instrumentación

## Objetivo
Optimizar la interfaz de Auditoría de Instrumentación para mejorar la densidad de información, la navegación directa a rosters y la edición rápida de repertorio, manteniendo la consistencia estética con el sistema de colores de la OFRN.

## Cambios técnicos realizados

### 1. Header compacto
- **Una sola fila**: Título "Auditoría de Instrumentación", filtro Fecha desde, Fecha hasta, selector Tipo de programa, indicador de diferencias Req/Conv y estado de carga en una única línea (`flex flex-wrap items-center gap-3`).
- **Eliminadas** las leyendas explicativas largas (texto sobre `getInstrumentValue`, Req Max, Conv, etc.).
- **DateInput**: etiquetas cortas "Desde" / "Hasta" y ancho controlado para mantener compacidad.

### 2. Cards de gira tematizadas
- **Estilos por tipo de programa**: Se usa `getProgramStyle(gira.tipo)` de `src/utils/giraUtils.js` para aplicar el esquema de colores OFRN (Sinfónico, Camerata Filarmónica, Ensamble, Jazz Band, Comisión, default) a cada card.
- **Eliminado** el texto "Formato requerido: ..." de la cabecera del acordeón.
- La card hereda `programStyle.color` (clases Tailwind: bg, text, border) para consistencia con `GiraCard.jsx`.

### 3. Navegación directa al Roster
- **Botón con `IconUsers`** en cada card de gira que llama a navegación a la vista ROSTER de Giras.
- Implementación: `useSearchParams()` de `react-router-dom`; al hacer clic se actualiza la URL con `tab=giras`, `view=ROSTER`, `giraId=<id>`.
- El botón usa `stopPropagation` para no disparar el expand/collapse del acordeón.

### 4. Desglose de obras (lazy) y acciones por obra
- **Lazy rendering**: El desglose de obras por programa se movió a un subcomponente `ProgramWorksTable` que **solo se monta cuando la gira está expandida** (`isOpen && <ProgramWorksTable ... />`). La lista de obras se calcula dentro del componente con `useMemo(..., [program._blocks])`, evitando procesar obras de giras no expandidas.
- **Icono `IconPencil`** junto al título de cada obra: abre el modal de **WorkForm** para editar la obra. Se pasa `workFormInitialData = { id: obraId }`; WorkForm carga el detalle por id.
- **Icono `IconFolder`** (solo si la obra tiene `link_drive`): abre el enlace de Drive en nueva pestaña. Se usa `buildDriveUrl(link_drive)` para soportar tanto URL completa como solo ID de carpeta (`https://drive.google.com/drive/folders/<id>`).
- **Modal WorkForm**: Renderizado en la vista con estado `workFormOpen` y `workFormInitialData`; cierre con `closeWorkForm` o desde `onSave`/`onCancel` del formulario. Se usa `catalogoInstrumentos={[]}`; WorkForm puede cargar instrumentos internamente si hace falta.

### 5. Tooltips en fila "Conv"
- En la fila de **Convocados (Conv)** de la tabla de resumen, cada celda de instrumento tiene un **tooltip nativo** (`title`) con la lista de **apellidos y nombres** de los músicos confirmados para ese instrumento en esa gira.
- **Lógica**: Función `getConvokedNamesByColumn(roster)` que:
  - Filtra el roster por `estado_gira === 'confirmado'` y excluye roles no orquestales (staff, produccion, chofer).
  - Asigna cada integrante a una columna de instrumento (Fl, Ob, Cl, Fg, Cr, Tp, Tb, Tba, Tim, Perc, Har, Pno) usando la misma clasificación que `computeConvokedForProgram` (nombre de instrumento, familia, `id_instr`).
  - Devuelve un mapa `{ Fl: ["Apellido, Nombre", ...], ... }`.
- Para la columna **Perc** se muestra la unión de nombres de Tim y Perc en el tooltip.
- Los IDs de integrantes se tratan como numéricos/enteros (PK) en el flujo de datos; el roster viene de `fetchRosterForGira`, que ya normaliza con `Number(id_integrante)` donde aplica.

### 6. Datos adicionales
- **Obras**: En la query de `programas_repertorios` → `repertorio_obras` → `obras` se incluye **`link_drive`** además de `id`, `titulo`, `instrumentacion`.
- **Roster por programa**: Cada programa enriquecido incluye **`_roster`** (array de integrantes devueltos por `fetchRosterForGira`) para poder calcular los tooltips de convocados sin una petición extra.

### 7. Archivos afectados
- **Vista**: `src/views/Management/InstrumentationAudit.jsx` (refactor completo según 1–6).
- **Utilidad**: `src/utils/giraUtils.js` (uso de `getProgramStyle`; sin cambios en el archivo).
- **Referencia de patrón**: `src/views/Giras/GiraCard.jsx` (estilos de programa y botón de vista).
- **Componente de formulario**: `src/views/Repertoire/WorkForm.jsx` (uso en modal; sin cambios).

## Resumen de requisitos cumplidos
| Requerimiento                         | Estado |
|--------------------------------------|--------|
| Header en una sola línea             | Sí     |
| Cards con getProgramStyle             | Sí     |
| Eliminar "Formato requerido"          | Sí     |
| Botón acceso rápido a GiraRoster      | Sí     |
| Lazy desglose de obras               | Sí     |
| IconPencil → WorkForm modal          | Sí     |
| IconFolder → link_drive              | Sí     |
| Tooltips Conv con nombres            | Sí     |
| IDs integrantes como integers        | Sí (ya en uso en fetch/roster) |
