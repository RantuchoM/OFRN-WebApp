# Refactor: DateInput – día de la semana a la izquierda

## Objetivo
Mostrar el día de la semana abreviado (2 letras) a la **izquierda** del campo de fecha, en lugar de un indicador a la derecha.

## Cambios realizados

### 1. Lógica de fecha
- **Nueva función** `getWeekdayShort(value)`:
  - Recibe la fecha en formato ISO (`yyyy-mm-dd`).
  - Usa `Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(date).substring(0, 2)` para obtener 2 letras.
  - Capitaliza la primera letra (ej.: "Lu", "Ma", "Mi").
  - Devuelve cadena vacía si no hay fecha válida.
- **Eliminado**: `dayNameFromIso` y la constante `DIA_SEMANA`, ya no usados.

### 2. Estructura y estilos (Tailwind)
- Contenedor principal del campo: `flex items-center gap-2`.
- **Indicador del día** (primero, a la izquierda):
  - Clases: `text-xs font-medium text-slate-400 w-6 text-right uppercase shrink-0`.
  - Se muestra solo cuando `showDayName` es true y hay fecha válida.
  - `aria-hidden` para no duplicar información para lectores de pantalla.
- El **input** queda en un `div` con `relative group flex-1 min-w-0` para mantener el layout con el botón del calendario.
- El **label** superior se mantiene igual: `label` con `mb-1 block` para que el flex no afecte la relación label/campo.

### 3. Limpieza
- Eliminado el indicador anterior a la derecha del input: `({dayName})` en un `<span>`.
- Eliminada la dependencia de `dayNameFromIso` y `DIA_SEMANA`.

### 4. Comportamiento
- La prop `showDayName` sigue controlando si se muestra el día (por defecto `true`).
- Si no hay valor o es inválido, el espacio a la izquierda no muestra texto (celda vacía de 2 letras cuando `showDayName` está activo, para no desplazar el input).
