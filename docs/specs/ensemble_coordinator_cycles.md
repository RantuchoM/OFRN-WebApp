## Spec: Colorización de Propuestas de Ciclo por Estado de Programa

### Problema
Las tarjetas de propuestas en la vista del Coordinador de Ensambles no reflejan visualmente el estado del programa de Supabase asociado (`Vigente`, `Pausada`, `Borrador`), dificultando la gestión rápida del ciclo anual.

### Requerimientos Técnicos
1. **Sincronización de Datos**: Asegurar que `RepertoireCyclesTab` incluya el campo `estado` de la tabla `programas` en su consulta principal.
2. **Normalización de IDs**: Las claves del `programsMap` deben manejarse consistentemente como String para evitar fallos de coincidencia con los tipos `bigint` de la base de datos.
3. **Mapeo de Estilos**:
   - `Vigente`: Bordes y fondo esmeralda (`emerald`).
   - `Pausada`: Bordes y fondo ámbar (`amber`).
   - `Borrador`: Bordes y fondo slate.
4. **Persistencia**: La UI debe actualizarse inmediatamente cuando se asocia un programa nuevo o se cambia el estado del mismo en el editor.

### Lógica de Implementación
- Modificar la `queryFn` de `repertoireCycles` para garantizar que el `programsMap` contenga el `estado`.
- Ajustar `CycleProposalCard` para que priorice el estado del mapa de programas sobre la relación anidada, garantizando reactividad.

### SQL
No se requieren cambios en el esquema SQL ya que la columna `estado` ya existe en la tabla `programas` (tipo `estado_gira`).

