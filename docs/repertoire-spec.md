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

## 4. Flag `excluir` en `repertorio_obras`

- **Programa / difusión**: las obras con `excluir = true` no aparecen en el listado de Difusión ni en la duración neta del bloque.
- **Drive de la gira**: `sync_repertoire_shortcuts` **sí** crea y mantiene el acceso directo numerado aunque la obra esté excluida del programa, para que los músicos puedan estudiarla desde la carpeta de la gira.
- **Mis Partes**: las obras excluidas siguen visibles para el músico. Las observaciones de programa (`repertorio_obras.notas_especificas`, stick-it de `ProgramRepertoire`) se muestran en lectura.

## 5. Soporte Multi-Bloque en Consumo de Repertorio

- **ProgramSeating.jsx** y **MyPartsViewer.jsx** deben:
  - Consumir todos los bloques de `programas_repertorios` asociados a un `id_programa`, sin limitarse al primer bloque.
  - Aplanar la estructura `Bloque -> Repertorio_Obras -> Obra` manteniendo el orden por `bloque.orden` y luego `repertorio_obras.orden`.
  - Tratar cada aparición de una obra en distintos bloques como una entrada independiente (no se deduplica por `id_obra`).
  - Resolver las particellas combinando asignaciones por contenedor (cuerdas) y por músico, de forma consistente con el Seating.