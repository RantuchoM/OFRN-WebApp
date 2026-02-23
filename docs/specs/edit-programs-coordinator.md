# Spec: Edición de Programas desde Vista Coordinación

## Objetivo
Permitir que los coordinadores de ensamble editen la configuración de sus programas (Giras de tipo Ensamble) directamente desde la pestaña "Programas" de su vista principal.

## Requerimientos Técnicos

### 1. Estilos visuales (integración con utils)
- Las tarjetas de programas obtienen sus clases de estilo mediante **`getProgramStyle(type)`** de `src/utils/giraUtils.js` (objeto `PROGRAM_TYPES`).
- Se aplica el estilo de fondo/borde/texto resultante (ej. `bg-emerald-50`, `text-emerald-700`, `border-emerald-200`) para mantener paridad con la vista de Giras.

### 2. Interfaz y acciones
- **Edición**: `IconEdit` abre `GiraForm` (solo para tipo "Ensamble"). Título: "Editar".
- **Repertorio**: `IconMusic` navega a la URL de repertorio de la gira. Título: "Ver Repertorio". URL: `/?tab=giras&view=REPERTOIRE&giraId=<id>` (ver [giras-url-routing.md](./giras-url-routing.md)).
- **Agenda**: `IconCalendar` navega a la URL de agenda de la gira. Título: "Ver Agenda". URL: `/?tab=giras&view=AGENDA&giraId=<id>`.
- Contenedor de acciones en la parte superior derecha de cada tarjeta.

### 3. Estado
- `editingProgram` (objeto o `null`): programa en edición.
- `selectedLocations` y `selectedStaff`: estado para el formulario de edición (locaciones e integrantes staff del programa).

### 4. Integración
- Al hacer clic en editar se abre el mismo modal que usa `GiraForm`.
- En modo edición: `isNew={false}`, `giraId` del programa, `enableAutoSave={true}`.
- Se reutiliza el estado de `giraFormData`, `selectedSources`, `selectedLocations` y `selectedStaff` para poblar el formulario.

### 5. Seguridad
- El coordinador solo puede editar programas donde uno de sus ensambles coordinados sea fuente (`giras_fuentes`). La lista de programas ya está filtrada por la query que usa `activeEnsembles`, por lo que solo se muestran programas en los que el usuario tiene participación.

## Flujo de Datos
- `ProgramCardItem` recibe la función `onEdit`.
- Al hacer clic en editar se ejecuta `handleEditProgram(program)`:
  - Se obtienen los datos completos del programa: fila en `programas`, `giras_localidades`, `giras_fuentes`, `giras_integrantes` (director/solista).
  - Se actualizan `giraFormData`, `selectedSources`, `selectedLocations`, `selectedStaff` y se asigna `editingProgram`.
- El modal se muestra cuando `isGiraModalOpen || editingProgram`.
- Al cerrar el modal de edición se resetea `editingProgram` a `null` y se invalida la query `['programs']` para reflejar cambios.

## Implementación

**Estado:** Implementado (incl. mejoras v2).

### Cambios realizados

1. **ProgramCardItem** (`EnsembleCoordinatorView.jsx`)
   - Uso de **`getProgramStyle(program.tipo)`** de `src/utils/giraUtils.js` para las clases CSS de la tarjeta (`.color`: fondo tenue, texto y borde por tipo). No se hardcodean colores.
   - Contenedor de acciones (esquina superior derecha): **Ver Agenda** (`IconCalendar`, `navigate({ pathname: "/", search: \`?tab=giras&view=AGENDA&giraId=${program.id}\` })`), **Ver Repertorio** (`IconMusic`, `navigate({ pathname: "/", search: \`?tab=giras&view=REPERTOIRE&giraId=${program.id}\` })`), **Editar** (`IconEdit`, solo si `program.tipo === "Ensamble"`, `onEdit(program)`).
   - Navegación mediante `useNavigate()` de `react-router-dom`. Las URLs de agenda y repertorio siguen el esquema documentado en [giras-url-routing.md](./giras-url-routing.md).

2. **EnsembleCoordinatorView**
   - Estado `editingProgram` (inicial `null`).
   - Estado `selectedLocations` y `selectedStaff` para el formulario de edición.
   - Función `handleEditProgram(program)`: antes de abrir el modal realiza un **fetch paralelo** a `programas`, `giras_fuentes`, `giras_localidades` y `giras_integrantes` (por `id_gira`), setea el estado del formulario con la data combinada y asigna `editingProgram`.

3. **Modal unificado**
   - El modal se muestra cuando `isGiraModalOpen || editingProgram`.
   - Si hay `editingProgram`: `GiraForm` recibe `giraId={editingProgram.id}`, `isNew={false}`, `enableAutoSave={true}`, `isCoordinator={true}`, `coordinatedEnsembles={myEnsembles.map(e => e.id)}`, y los estados de locaciones y staff.
   - Al cerrar en modo edición: `setEditingProgram(null)` y `queryClient.invalidateQueries(['programs'])`.

4. **Validación y seguridad**
   - `GiraForm` recibe `isCoordinator={true}` y `coordinatedEnsembles={myEnsembles.map(e => e.id)}`, manteniendo las reglas de validación existentes.

5. **Consistencia visual (v2)**
   - Uso confirmado de **giraUtils** (`getProgramStyle`) para las tarjetas de programas, alineado con la vista de Giras y evitando colores hardcodeados.
   - Acciones de navegación (Agenda, Repertorio) y edición centralizadas en la tarjeta.

La funcionalidad ha sido implementada satisfactoriamente.
