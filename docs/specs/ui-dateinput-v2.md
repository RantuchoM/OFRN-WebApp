# Spec: DateInput v2 - Indicador de Día e Icono Solapados

## Objetivo
Optimizar el espacio del input de fecha permitiendo que el indicador del día de la semana y el icono de calendario ocupen el mismo lugar físico a la izquierda, alternando su visibilidad.

## Lógica de UI
1. **Indicador de Día**: Se muestra por defecto a la izquierda. Formato breve de 2 letras en mayúsculas (ej: "LU", "MA").
2. **Icono de Calendario**: Se posiciona exactamente sobre el indicador de día con `opacity-0`.
3. **Interacción (Hover)**: 
   - Al hacer hover sobre el contenedor, el icono pasa a `opacity-100` y el indicador de día a `opacity-0`.
   - El año al final del input dispone de espacio libre al no haber icono a la derecha.

## Implementación realizada

### 1. Lógica de día
- Función `getDayBrief(val)`:
  - Si no hay valor, retorna `''`.
  - Parsea `yyyy-mm-dd`, crea `Date`, formatea con `Intl.DateTimeFormat('es-AR', { weekday: 'short' })`.
  - Retorna los dos primeros caracteres en mayúsculas (`.substring(0, 2).toUpperCase()`).

### 2. Layout (Tailwind)
- Contenedor del campo: `div` con `relative group` que envuelve indicador, icono e input.
- **Span del día breve**: `absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 group-hover:opacity-0 transition-opacity pointer-events-none`.
- **Botón con IconCalendar**: `absolute left-2 top-1/2 -translate-y-1/2`, botón con `opacity-0 group-hover:opacity-100 transition-opacity z-10`.
- **Input**: `pl-8` fijo para no pisar el indicador/icono; eliminado `pr-8` para liberar espacio a la derecha (año).

### 3. Limpieza
- Eliminado el contenedor flex externo y el indicador de día separado a la izquierda.
- El input ya no lleva padding derecho innecesario; el año tiene espacio libre.

### 4. Props
- `showDayName`: controla si se muestra el día breve (por defecto `true`).
- `showCalendarPicker`: controla si se muestra el botón de calendario (por defecto `true`).

---

## Bug corregido: solo guardaba el primer dígito al editar con valor existente (feb 2025)

### Síntoma
Cuando el campo ya tenía un valor (p. ej. la fecha de hoy en UnifiedAgenda “Desde”), al entrar y empezar a escribir (p. ej. "19" en el día), se guardaba "01" o solo el primer dígito. Con el campo en blanco no pasaba.

### Causas (dos correcciones)

1. **handleBlur con entrada incompleta**  
   En `handleBlur` se llamaba a `segmentsToIso(day, month, year)`, que hace `padStart(2, '0')` en día y mes. Si el usuario había escrito solo "1" en el día (para luego poner "19") y hacía blur (clic fuera, Tab, etc.), se generaba `"2025-02-01"` y se llamaba a `onChange("2025-02-01")`, guardando el día 01 en vez de esperar a que completara.

2. **useEffect sobrescribiendo al escribir**  
   El efecto que sincroniza `value` → estado se ejecutaba en cada render. Al escribir el primer carácter, el padre aún no había actualizado `value`, y en el siguiente render el efecto podía restaurar el valor anterior y pisar lo que el usuario acababa de escribir.

### Soluciones

1. **handleBlur**: Solo emitir `onChange(iso)` cuando los tres segmentos están completos (día 2 dígitos, mes 2, año 4). Si hay entrada incompleta (p. ej. día "1"), no guardar en blur; el valor anterior se mantiene.

2. **useEffect**: Usar un ref `lastValueRef` con el último `value` recibido; el efecto solo sincroniza cuando `value !== lastValueRef.current`, así no se sobrescribe la edición en curso.