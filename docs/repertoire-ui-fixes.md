## Spec: Repertoire UI Fixes (Dropdown Z-Index & Width)

### Problema

1. **Encapsulamiento (clipping)**: el `overflow-x-auto` del contenedor de la tabla y otros contenedores con scroll hacían que los menús desplegables quedaran recortados dentro del bloque de repertorio.
2. **Visibilidad de nombres largos**: la columna de compositor era estrecha, por lo que el desplegable heredaba un ancho demasiado pequeño y dificultaba distinguir entradas similares (por ejemplo, `Bach, Johann Sebastian` vs `Bach, Carl Philipp Emanuel`).

### Solución Técnica Implementada

#### 1. Portales en `SearchableSelect`

- El componente `SearchableSelect` ya utilizaba `createPortal` de `react-dom` para renderizar el menú:
  - Se mantiene este enfoque, inyectando el dropdown en `document.body` con la clase `searchable-portal`.
- Se añadió una prop configurable `dropdownMinWidth` (por defecto `250px`) para desacoplar el ancho del menú del ancho de la columna.
- El cálculo de posición ahora:
  - Usa `getBoundingClientRect()` sobre el contenedor del campo.
  - Posiciona el menú con `top = rect.bottom + window.scrollY + 5` y `left = rect.left + window.scrollX`.
  - Establece `minWidth = dropdownMinWidth` y `width = max(rect.width, dropdownMinWidth)` para evitar que la lista quede más angosta que la columna cuando se requieren nombres largos.
  - Aplica `z-index: 99999` para situar el menú por encima de headers sticky y otros elementos.
- Mientras el menú está abierto (`isOpen === true`):
  - Se recalcula posición en `resize` de la ventana.
  - Se escucha `scroll` a nivel de ventana (`capture: true`) y, por simplicidad, **se cierra el desplegable al hacer scroll**, evitando que quede “desalineado” respecto al campo.

#### 2. Uso específico en `WorkForm` (Compositores / Arregladores)

- En `WorkForm.jsx`, para los campos de **Compositores** y **Arregladores**, se pasa ahora `dropdownMinWidth={350}` a `SearchableSelect`:
  - Esto garantiza que el dropdown tenga al menos ~350px de ancho, incluso si la columna es más estrecha.
  - Mejora la legibilidad y permite distinguir fácilmente compositores con el mismo apellido.

#### 3. RepertoireManager y Quick Entry

- En `RepertoireManager.jsx` se había intentado inicialmente resolver el clipping solo con `overflow-visible` y `z-index`, lo que no es suficiente cuando el contenedor padre tiene scroll.
- La solución estructural para desplegables complejos dentro de tablas con scroll pasa por:
  - Renderizar los menús mediante **Portales** (como se hace en `SearchableSelect`).
  - Evitar que el ancho del menú quede rígidamente ligado al ancho de la celda.
- El patrón aplicado en `SearchableSelect` sirve como referencia para futuros refactors del `QuickWorkRow` y otros dropdowns personalizados que aún no usan el componente.

### Consideraciones de Arquitectura

- Al usar Portales para desplegables dentro de tablas con `overflow-x-auto` o vistas con scroll, es crítico gestionar el **posicionamiento y el ciclo de vida** del menú:
  - Se calcula la posición en base al `boundingClientRect` del input cada vez que se abre.
  - Los listeners de `resize` y `scroll` ayudan a cerrar el menú si el usuario desplaza la vista, evitando estados visuales inconsistentes.
- El uso de un `z-index` alto en el portal (p. ej. `z-[9999]` o superior) es indispensable para que el menú flote por encima de encabezados sticky y overlays ligeros.
- Para casos donde la tabla o contenedor padre tenga `overflow-y` además de `overflow-x`, el patrón recomendado es siempre **portalizar** el dropdown (no confiar solo en `overflow-visible`).

