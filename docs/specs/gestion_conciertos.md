# Spec: Gestión de Conciertos - Módulo de Gestión

## 1. Objetivo
Visualizar y exportar la programación de conciertos con filtros dinámicos por tipo de programa, ensambles y familias de instrumentos.

## 2. Origen de Datos (Tablas Clave)
- **Base**: `public.eventos` (Filtrar por tipo de evento relacionado a conciertos).
- **Logística**: `public.locaciones` y `public.localidades`.
- **Estado**: `public.venue_status_types` (unido vía `id_estado_venue`).
- **Participantes**: `public.eventos_ensambles` (Ensambles) y `public.giras_fuentes` (Familias asociadas a la gira/programa).
- **Repertorio**: `public.programas_repertorios` -> `public.repertorio_obras` -> `public.obras` -> `public.compositores`.

## 3. Lógica de Filtros
- **Fecha**: Por defecto `>= CURRENT_DATE`.
- **Tipo de Programa**: Columna `public.programas.tipo`. (Excluir "Comisión" por defecto).
- **Participantes**:
  - Ensambles: Basado en `eventos_ensambles`.
  - Familias: Basado en `giras_fuentes` (tipo "FAMILIA") del programa asociado al evento.

## 4. Formato de Columnas
- **Repertorio**: Concatenación de: `{Compositor.apellido}, {Compositor.nombre} - {Obra.titulo}`.
  - Regla: Solo tomar la primera línea de `Obra.titulo` si hay saltos de línea.

## 5. Checklist de Implementación
- [x] Crear `src/services/giraService.js#getConciertosFullData` con joins de programa, locación/localidad, estado de venue, ensambles, familias y repertorio completo.
- [x] Crear `src/views/Giras/ConciertosView.jsx` con tabla y filtros dinámicos (fecha, tipo de programa, ensambles/familias).
- [x] Aplicar formato de repertorio `"Apellido, Nombre (Compositor) - Título [1ra línea]"`.
- [x] Agregar exportación a Excel y PDF reutilizando `src/utils/excelExporter.js` y `src/utils/agendaPdfExporter.js`.
- [x] Registrar la vista en Gestión dentro de la navegación de la app (`src/App.jsx` + `src/views/Management/ManagementView.jsx`).
