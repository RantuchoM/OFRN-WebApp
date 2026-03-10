# Fix: Prioridad de Regla Personal en Panel de Pasajeros

## Estado

Completado.

## Problema

En el modal de **"Gestionar Pasajeros"** y en los paneles de transporte, algunos integrantes con una regla de transporte de tipo **Integrante (Personal)** aparecían también como pasajeros de buses definidos por reglas de **Localidad**, generando duplicidades visuales y conteos inconsistentes.

## Lógica de Resolución

Se define una jerarquía clara:

1. **Prioridad Alta**: Reglas por `Integrante` / `Persona`.
2. **Prioridad Baja**: Reglas por `Localidad` (u otros alcances grupales).

Si un integrante tiene una regla de tipo **Integrante/Persona** para un trayecto (subida o bajada), cualquier asignación derivada de reglas de **Localidad** para ese mismo trayecto debe considerarse anulada a nivel de logística efectiva y visualización.

## Cambios Técnicos

### 1. `useLogistics.js`

- En `calculateLogisticsSummary`:
  - El bloque de transporte ahora:
    - Calcula `personalRouteRules` por integrante, detectando si tiene reglas de alcance `"Persona"` / `"Integrante"` para subida o bajada.
    - Deriva las banderas:
      - `hasPersonalSubida`
      - `hasPersonalBajada`
    - Dentro del bucle de `myRoutes`:
      - Para cada regla se obtiene `scope = normalize(r.alcance)`.
      - Solo se permite que una regla de **Localidad** aporte `subida` si **no** existe `hasPersonalSubida`. Igual para `bajada` con `hasPersonalBajada`.
    - Al construir cada entrada en `log.transports` se guardan campos extra:
      - `subidaScope`: alcance normalizado (`"persona"`, `"localidad"`, etc.) de la regla ganadora de subida (si existe).
      - `bajadaScope`: idem para bajada.
  - Resultado:
    - El `logisticsMap` (expuesto vía `summary[i].logistics.transports`) sabe, por cada bus y por trayecto, si la asignación provino de una regla de **Integrante** o de **Localidad**.
    - Una regla personal sobre un trayecto impide que se genere una segunda asignación por localidad para ese mismo trayecto, en cualquier bus.

### 2. `TransportPassengersModal.jsx`

- El componente ahora:
  - Construye `transportByPersonId` a partir de `roster` (que debe provenir del `summary` de `useLogistics`), con la forma:
    - `{ [idPersona]: [{ id, nombre, subidaScope, bajadaScope }, ...] }`.
  - Define:
    - `isOverriddenByPersonal(person)`:
      - Localiza la entrada de este transporte (`transporte.id`) para la persona.
      - Detecta si esa entrada llega solo por **Localidad** (ninguna de las scopes de subida/bajada es `"persona"` ni `"integrante"`).
      - Verifica si existe **otro** transporte donde la scope de subida o bajada sea `"persona"`/`"integrante"`.
      - Si ambas condiciones se cumplen, la presencia en este bus se considera anulada por una regla personal en otro bus.
    - `hasMultiPersonalConflict(person)`:
      - Cuenta cuántos transportes distintos tiene la persona con scopes `"persona"`/`"integrante"`.
      - Si son más de uno, hay conflicto de asignación de mismo nivel.
- Aplicación:
  - **Filtro de visualización**:
    - A partir del `filteredRoster` (búsqueda + rol), se genera `effectiveRoster` filtrando a quienes cumplan `!isOverriddenByPersonal(p)`.
    - La lista renderizada mapea sobre `effectiveRoster`, de modo que los pasajeros mostrados ya respetan la prioridad personal > localidad.
  - **Conteo en el header del modal**:
    - Se calcula `effectiveAssignedCount` tomando solo los IDs de `assignedIds` cuya persona **no** esté sobreescrita por una regla personal en otro bus.
    - El subtítulo ahora muestra:  
      - `{transporte?.nombre} • {effectiveAssignedCount} Asignados`.
  - **Visualización de conflictos**:
    - Si `hasMultiPersonalConflict(p)` es verdadero:
      - La fila del pasajero se pinta con clases Tailwind `bg-amber-900 text-amber-50 border-amber-700`.
      - El `title` (tooltip nativo) muestra:  
        - `"Conflicto de asignación: [Nombre Bus 1] / [Nombre Bus 2] / ..."`.
    - Estos casos se mantienen visibles en todos los buses afectados, ya que representan verdaderos conflictos de reglas personales.

## Impacto en Otros Paneles

- La estructura de `summary` y `logisticsMap` se mantiene compatible:
  - Los nuevos campos (`subidaScope`, `bajadaScope`) son aditivos en cada elemento de `logistics.transports`.
  - Los paneles que solo leen `subidaId` / `bajadaId` siguen funcionando sin cambios.
- Los conteos de pasajeros en el Dashboard de Transporte, que se basan en `summary[i].logistics.transports`, ya respetan la jerarquía de prioridad gracias a la lógica de `useLogistics`.

