# Spec: Validación y Asignación de Transporte en EventForm

## Objetivo
Garantizar que todos los eventos de tipo "Transporte" (IDs 11 y 12) tengan un vehículo asignado de la flota de la gira correspondiente antes de ser guardados.

## Reglas de Negocio
1. **Identificación:** Los tipos de evento `tipo_id === 11` (Salida/Viaje) y `tipo_id === 12` (Llegada/Traslado) son considerados eventos de transporte.
2. **Obligatoriedad:** No se debe permitir la creación o edición de estos eventos si el campo `transporte_id` (en BD: `id_gira_transporte`) está vacío.
3. **Origen de Datos:** El selector debe nutrirse de la tabla `giras_transportes` filtrando por el `gira_id` activo.
4. **UI/UX:**
   - Mostrar un `SearchableSelect` o `select` de Tailwind solo cuando el tipo de evento coincida.
   - Deshabilitar el botón "Guardar" o mostrar un error de validación si falta el transporte en estos tipos.

## Implementación Técnica
- **Hook:** Usar `useEffect` para cargar la lista de transportes de la gira al abrir el formulario.
- **Estado:** Añadir `transporte_id` (en código: `id_gira_transporte`) al objeto de estado del formulario.
- **Validación:** En la función de envío del formulario, añadir un check específico para los IDs 11 y 12.

## Estado de Implementación
- [x] Documentación creada (spec-event-transport-validation.md).
- [x] Servicio: `getTransportesByGira(supabase, giraId)` en `giraService.js`.
- [x] EventForm: carga de transportes por giraId, selector (SearchableSelect) cuando tipo 11/12, validación y bloqueo de guardado (botón deshabilitado + mensaje de error).
- [x] Callers: UnifiedAgenda, LogisticsManager, WeeklyCalendar y MusicianCalendar pasan `giraId` e incluyen `id_gira_transporte` en payloads de guardado.
