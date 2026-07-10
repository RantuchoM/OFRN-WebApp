# Spec: Retorno del viático a SCRN (badge "Viático generado")

## Objetivo
Cerrar el bucle de la vinculación Transporte SCRN ↔ Viáticos Manual: cuando un usuario
completa (guarda) un viático que se originó desde un recorrido SCRN, la pantalla
**Mis viajes** (`MisReservas`) debe indicar que ese recorrido ya tiene su viático generado.

## Contexto
- El handoff actual es unidireccional (SCRN → viáticos) vía `buildScrnViaticoPrefill` +
  `navigate("/viaticos-manual?prefill=scrn", { state })`.
- El viático guardado en `viaticos_manual_viatico.datos` ya conserva
  `scrn_origen = { reserva_id, pax_id, viaje_id, rol }` (persistido por `buildViaticoDatos`,
  que hace spread de `form`).
- Ambas entidades (`viaticos_manual_viatico`, `scrn_reservas`, `scrn_reserva_pasajeros`)
  viven en el mismo proyecto Supabase (`supabaseOficinaExterna`).

## Decisión de diseño: estado derivado (sin write-back ni migración)
En vez de agregar columnas `viatico_id` a las tablas SCRN y escribir de vuelta al guardar
(lo que exige migración + permisos RLS de UPDATE sobre filas que el usuario podría no poseer,
p. ej. un pasajero sobre `scrn_reserva_pasajeros`), se **deriva** el estado leyendo los
viáticos del propio usuario que apuntan a la reserva/pax.

Ventajas:
- Cero migraciones y cero cambios de RLS.
- Fuente de verdad única: el propio viático porta su `scrn_origen`.
- RLS de `viaticos_manual_viatico` (por `usuario_id = auth.uid()`) coincide exactamente con
  el modelo per-persona del botón "Completar viático": cada usuario ve el estado de *su* fila.

Limitación aceptada: el titular no ve si un pasajero generó su viático (correcto: el badge es
per-persona). Si en el futuro se necesita visión cruzada, se evaluará write-back con columnas.

## Alcance
1. **Servicio** `listViaticosScrnGenerados()` en `viaticosManualService.js`:
   - Consulta `viaticos_manual_viatico` filtrando `datos->scrn_origen` no nulo.
   - Devuelve `[{ id, created_at, scrn_origen }]` (RLS ya limita al usuario actual).
2. **MisReservas**:
   - En `loadData`, cargar los viáticos generados y construir dos lookups:
     `viaticoTitularPorReserva[reserva_id]` (rol `titular`) y `viaticoPorPax[pax_id]` (rol `pasajero`).
   - Recargar junto con `reloadKey`/`paxReload`.
   - Mostrar un **badge** "✓ Viático generado · {fecha}" en la fila del titular y en la fila
     como-pasajero cuando exista coincidencia. El botón "Completar viático" se mantiene.

## Contrato de datos
```
scrn_origen = {
  reserva_id: number | null,
  pax_id:     number | null,
  viaje_id:   number | null,
  rol:        "titular" | "pasajero"
}
```
Match:
- Titular: `rol === "titular" && String(reserva_id) === String(reserva.id)`.
- Pasajero: `rol === "pasajero" && String(pax_id) === String(pax.id)`.

## Fuera de alcance / deuda futura
- Write-back real (columna `viatico_id` en tablas SCRN) para visión del titular sobre pasajeros.
- Evitar duplicados: reabrir "Completar viático" crea un registro nuevo (comportamiento
  preexistente de `applyScrnPrefill`, que resetea `cloudViaticoId`). No se resuelve acá.

## Estado
- [x] Servicio `listViaticosScrnGenerados`.
- [x] Lookups + badge en `MisReservas` (titular y pasajero).
