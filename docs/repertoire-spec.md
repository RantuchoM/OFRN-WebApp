# Especificación Técnica: RepertoireManager y Ordenamiento

## 1. Propósito
Gestionar la lista de obras (repertorio) de una gira, permitiendo añadir, quitar y reordenar la secuencia de ejecución.

## 2. Lógica de Reordenamiento
- Se utiliza el campo `orden` (integer) en la tabla de bloques (`programas_repertorios`) y en la tabla de obras por bloque (`repertorio_obras`), respetando siempre el orden combinado **Bloque.orden → RepertorioObra.orden**.
- El componente `RepertoireManager.jsx` maneja la lógica de intercambio de posiciones (swap) mediante funciones `moveUp` y `moveDown`.

## 3. Estándares Visuales de Controles
- Los controles de ordenamiento (flechas) deben ser intuitivos y de alta visibilidad para los editores.
- Se prefieren iconos de `@/components/ui/Icons` (como `IconChevronUp`, `IconChevronDown` o `IconArrowUp`).
- Estado visual: En modo edición, los controles deben tener una opacidad del 100% y un tamaño suficiente para interactuar fácilmente en pantallas táctiles o escritorio.

## 4. Soporte Multi-Bloque en Consumo de Repertorio

- **ProgramSeating.jsx** y **MyPartsViewer.jsx** deben:
  - Consumir todos los bloques de `programas_repertorios` asociados a un `id_programa`, sin limitarse al primer bloque.
  - Aplanar la estructura `Bloque -> Repertorio_Obras -> Obra` manteniendo el orden por `bloque.orden` y luego `repertorio_obras.orden`.
  - Tratar cada aparición de una obra en distintos bloques como una entrada independiente (no se deduplica por `id_obra`).
  - Resolver las particellas combinando asignaciones por contenedor (cuerdas) y por músico, de forma consistente con el Seating.