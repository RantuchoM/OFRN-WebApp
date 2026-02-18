# Componente: LocationSelectWithCreate

## Objetivo
Crear un selector de locaciones estandarizado que permita la creación rápida de nuevos registros en la tabla `locaciones` (sedes de ensayo) sin salir del formulario principal.

## Especificaciones Técnicas
- **Props**: 
    - `supabase`: Cliente Supabase.
    - `value`: ID de la locación seleccionada.
    - `onChange`: Callback para actualizar el estado del formulario padre.
    - `options`: Lista de locaciones para el select.
    - `onRefresh`: Función para recargar el catálogo de locaciones desde Supabase.
    - `placeholder`, `className` (opcionales).
- **UI**: 
    - Un contenedor flex que agrupa un `SearchableSelect` y un botón `IconPlus`.
    - Un modal (React Portal) para crear la nueva locación.
- **Campos del modal de creación**:
    - Nombre (obligatorio)
    - Localidad (SearchableSelect sobre tabla `localidades`)
    - Dirección
    - Teléfono
    - Aforo (capacidad)
    - Email
- **Comportamiento**:
    - Tras insertar en `locaciones`, el componente invoca `onRefresh()` y ejecuta `onChange(newId)` para que el formulario quede actualizado.

## Ubicación
`src/components/forms/LocationSelectWithCreate.jsx`

## Integración
El componente está integrado en:
- `IndependentRehearsalForm.jsx` – selector "Lugar / Sala"
- `MassiveRehearsalGenerator.jsx` – selector "Lugar (Opcional)"
- `EventForm.jsx` – selector "Ubicación / Sala" (cuando recibe `supabase` y `onRefreshLocations`)
- `GiraForm.jsx` – `ConcertFormModal` selector "Lugar / Sala"

Los padres que usan EventForm y pasan `supabase` + `onRefreshLocations`:
- `UnifiedAgenda.jsx`
- `LogisticsManager.jsx`
- `WeeklyCalendar.jsx`
- `MusicianCalendar.jsx`