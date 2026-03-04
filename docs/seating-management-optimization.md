# Optimización de Gestión de Cuerdas y Atriles

## 1. Visualización de Atriles

- **Objetivo:** Facilitar la lectura de pares de músicos (atriles) en los contenedores de cuerdas.
- **Implementación:** En la vista de escritorio y móvil, se inyectará un separador visual (borde o margen) cada 2 músicos dentro de un contenedor.
  - El cálculo se basa en el índice del array: `(idx + 1) % 2 === 0`.

## 2. Importación Inteligente de Contenedores

- **Objetivo:** Permitir la actualización de integrantes sin romper las asignaciones de particellas (`seating_asignaciones`).
- **Flujo de Importación:**
  1. **Previsualización:** Al seleccionar un programa/gira origen, mostrar los contenedores disponibles.
  2. **Mapeo (Match):** El usuario podrá elegir entre:
     - **Actualizar Integrantes (mantener grupos):** Borrar únicamente los `seating_contenedores_items` del contenedor destino y cargar los del origen, manteniendo el `id_contenedor` (PK). Esto preserva el Seating y las asignaciones de particellas.
     - **Crear Nuevos Contenedores:** Crear contenedores nuevos en el programa actual con los integrantes del origen, sin tocar los existentes.
     - **Borrado Total:** Eliminar contenedores actuales y crear nuevos con la configuración del programa origen (se avisa de la pérdida de datos).
  3. **Selección Múltiple:** Checkboxes para elegir qué grupos (Violines I, II, etc.) importar.

## 3. Integridad de Datos

- Las operaciones deben realizarse mediante promesas encadenadas y operaciones atómicas por contenedor para asegurar que no queden contenedores vacíos si falla la red.

## 4. Estado de Implementación

- **Visualización de atriles:** ✅ Implementado en `ProgramSeating`:
  - Móvil: `MobileSeatingTable` aplica un borde inferior reforzado (`border-b-2 border-slate-300`) cada 2 músicos dentro de cada contenedor de cuerdas, calculado como `(idx + 1) % 2 === 0`.
  - Escritorio: el detalle expandido de grupos en `ContainerInfoCell` muestra los músicos con un separador visual de atril (borde inferior reforzado) cada 2 integrantes.
- **Importación inteligente de contenedores:** ✅ Implementado en `GlobalStringsManager`:
  - Modal de importación con:
    - Selección de programa origen.
    - Previsualización de contenedores con listado resumido de integrantes.
    - Checkboxes para seleccionar qué grupos importar.
    - Modos de importación:
      - **Actualizar integrantes:** si el nombre del contenedor coincide (normalizado), se borran solo los `seating_contenedores_items` del destino y se insertan los del origen manteniendo el `id_contenedor`.
      - **Crear nuevos contenedores:** crea contenedores nuevos con los integrantes del origen, preservando los existentes.
      - **Borrado total:** elimina los contenedores actuales y recrea la configuración desde el programa origen.
  - Todas las operaciones se realizan con operaciones atómicas por contenedor sobre las tablas `seating_contenedores` y `seating_contenedores_items`, respetando el esquema existente y los IDs numéricos de integrantes.


