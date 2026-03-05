# Spec: Edición Masiva en VenuesManager (Logística)

## Objetivo
Permitir a los administradores/editores realizar cambios de estado y notas en múltiples conciertos/eventos simultáneamente desde el panel de Gestión General.

## Lógica de Implementación
1. **Selección**  
   - Estado `selectedEventIds` (Set) para rastrear los IDs de los eventos seleccionados.  
   - Checkbox maestro en el header que selecciona todos los `filteredEvents`.

2. **Interfaz**  
   - Nueva columna de checkbox a la izquierda de "Fecha".  
   - **BulkActionBanner**: Un banner flotante o fijo que aparece cuando `selectedEventIds.size > 0`.

3. **Acciones Masivas**  
   - Selector de `id_estado_venue`.  
   - Campo de texto para `nota`.  
   - Ejecución vía `supabase.from('eventos').update().in('id', [...])` y creación de logs en `eventos_venue_log` para cada evento afectado.

## Flujo de Datos
- Al aplicar, se debe iterar sobre los IDs seleccionados para insertar los registros correspondientes en la tabla de auditoría `eventos_venue_log`, manteniendo la integridad del historial.

## Checklist de implementación
- [x] Definir objetivo y flujo de datos.
- [x] Implementar selección múltiple en `VenuesManager`.
- [x] Implementar `BulkActionBanner` / `BulkEditBanner` y UI de acciones masivas.
- [x] Implementar `handleBulkSave` con Supabase y logs en `eventos_venue_log`.
- [x] Verificar estilos Tailwind y comportamiento en el módulo de logística.
