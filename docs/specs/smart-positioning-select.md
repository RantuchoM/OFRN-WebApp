# Spec: Posicionamiento Inteligente en SearchableSelect

## Problema

El dropdown de `SearchableSelect` utilizaba un posicionamiento fijo hacia abajo (`rect.bottom`). Cuando el selector se encontraba en el tercio inferior de la pantalla, el menú se cortaba o requería scroll excesivo, degradando la UX.

## Solución

Modificar el `useEffect` de posicionamiento para que:

1. Calcule el espacio disponible debajo del componente.
2. Compare ese espacio con una altura estimada del dropdown (250px, consistente con `max-h-60` + buscador).
3. Si el espacio inferior es insuficiente, posicione el menú para que crezca hacia arriba desde el `rect.top` en lugar de hacia abajo.

## Implementación Actual

- **Detección de dirección (up/down)**:
  - Se calcula `spaceBelow = window.innerHeight - rect.bottom`.
  - Se define `estimatedHeight = 250`.
  - Si `spaceBelow < estimatedHeight` **y** `rect.top > estimatedHeight`, se activa el modo **drop-up** (`shouldDropUp = true`); en caso contrario se mantiene el modo estándar hacia abajo.
  - Se guarda este estado en `isDropUp` para reutilizarlo en la animación.

- **Cálculo de posición**:
  - Común a ambos casos:
    - `left: rect.left + window.scrollX`
    - `minWidth: dropdownMinWidth`
    - `width: Math.max(rect.width, dropdownMinWidth)`
    - `zIndex: 99999`
  - **Modo hacia abajo (por defecto)**:
    - `top: rect.bottom + window.scrollY + 5`
    - `bottom: 'auto'`
  - **Modo hacia arriba (drop-up)**:
    - `top: 'auto'`
    - `bottom: window.innerHeight - rect.top - window.scrollY + 5`
    - Esto ancla el dropdown a 5px por encima del componente, creciendo hacia arriba.

- **Animaciones y origen de transformación**:
  - Se mantiene el uso de `createPortal` y las clases base:
    - `animate-in fade-in zoom-in-95 duration-100`
  - Se añade un `origin` dinámico para que la animación respete la dirección:
    - Si abre hacia abajo: `origin-top`
    - Si abre hacia arriba: `origin-bottom`
  - Clase final del contenedor del dropdown:

  ```jsx
  className={`searchable-portal fixed bg-white border border-slate-300 shadow-xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${isDropUp ? 'origin-bottom' : 'origin-top'}`}
  ```

- **Cierre y comportamiento existente**:
  - Se mantiene intacto el cierre por:
    - **Click outside**: comparando contra `containerRef` y `.searchable-portal`.
    - **Scroll**: al hacer scroll se cierra (`setIsOpen(false)`), sin cambios.
  - No se modifican ni la lógica de filtrado ni el comportamiento de multi-select.

## Color opcional en opciones

- Cada opción puede incluir `color` (hex/CSS). Si está presente:
  - En el valor cerrado (single): punto de color a la izquierda del label.
  - En el desplegable: mismo punto a la izquierda de label + `subLabel`.
- Uso en `EventForm` (tipo de evento): searchable con `subLabel` = categoría (`categorias_tipos_eventos.nombre`) y `color` del tipo. Los catálogos que alimentan el form (`UnifiedAgenda`, calendarios, logística) seleccionan `color` + join de categoría.

## Notas Técnicas

- El umbral de 250px se alinea con la altura máxima (`max-h-60`) del listado + cabecera de búsqueda, adelantando el cambio de dirección antes de llegar al borde real del viewport.
- El uso de `bottom` en modo drop-up permite mantener el portal como `position: fixed` sin romper el cálculo de click outside ni el stacking (`z-index`).
- En componentes padres no se requiere ningún cambio; el comportamiento es completamente encapsulado dentro de `SearchableSelect`.

