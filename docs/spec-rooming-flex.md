#+ Spec: Rooming Flexible y Gestión de Cunas (Placeholders)

## Objetivo
Implementar un sistema donde los integrantes asignados a una habitación puedan declararse como "no ocupantes de cama" (Cunas/Menores), afectando visualmente la UI y lógicamente los reportes.

## Reglas de Negocio
1. **Persistencia**: Se usa `asignaciones_config` (JSONB) en lugar de depender únicamente de `id_integrantes_asignados`.
2. **Lógica de Capacidad**: 
   - La capacidad de la habitación (SGL, DBL, TPL) se calcula contando SOLO a los integrantes con `ocupa_cama: true`.
   - Los integrantes con `ocupa_cama: false` son "Adicionales" y no suman al tipo de habitación técnica para el hotel.
3. **Comportamiento Visual**:
   - `ocupa_cama: true`: Se muestra el `MusicianCard` normal.
   - `ocupa_cama: false`: El card se transforma en un **Mini-Placeholder** (Badge compacto).
4. **Comidas (no consume)**: Quien está en cuna (`ocupa_cama: false` / `en_cuna`) **no cuenta** para comidas bajo ningún criterio (Tutti, Solo alojados, categoría, etc.). Se marca en `calculateLogisticsSummary` y se excluye en `isPersonEligibleForMealSlot` / `isUserConvoked`.
5. **Hotelería / Pedido Inicial**:
   - El bebé en cuna **no suma** pax ni camas noche (no se paga).
   - Sí se informa en pedido (tabla, resumen y texto) con **cantidad + check-in/out + nombre** para que el hotel prepare la cuna.
   - El Reporte de Rooming ya lista `(Cuna)`, columna cuna y noches solo de ocupantes de cama.

## Tareas UI/UX
- [x] Agregar botón toggle (icono Bed/Baby) en cada card dentro de la habitación.
- [x] El contenedor de la habitación debe tener un área visualmente diferenciada (punteada o más pequeña) para los integrantes en cuna.
- [x] Sincronizar cambios inmediatamente a Supabase.
- [x] Excluir bebés en cuna del conteo y convocatoria de comidas (matriz, asistencia, reporte, mis comidas).
- [x] Pedido Inicial / ajuste / texto hotelería: cunas diferenciadas sin sumar noches pagas.
