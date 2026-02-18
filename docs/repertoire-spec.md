# Especificación Técnica: RepertoireManager y Ordenamiento

## 1. Propósito
Gestionar la lista de obras (repertorio) de una gira, permitiendo añadir, quitar y reordenar la secuencia de ejecución.

## 2. Lógica de Reordenamiento
- Se utiliza el campo `orden` (integer) en la tabla `giras_repertorio`.
- El componente `RepertoireManager.jsx` maneja la lógica de intercambio de posiciones (swap) mediante funciones `moveUp` y `moveDown`.

## 3. Estándares Visuales de Controles
- Los controles de ordenamiento (flechas) deben ser intuitivos y de alta visibilidad para los editores.
- Se prefieren iconos de `@/components/ui/Icons` (como `IconChevronUp`, `IconChevronDown` o `IconArrowUp`).
- Estado visual: En modo edición, los controles deben tener una opacidad del 100% y un tamaño suficiente para interactuar fácilmente en pantallas táctiles o escritorio.