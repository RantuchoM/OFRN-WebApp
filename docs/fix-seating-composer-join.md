## Fix: Resolución de Nombres de Compositores en ProgramSeating

### Problema
Los encabezados de las obras en la vista de Seating muestran "Anónimo" debido a un error en el acceso a las propiedades del objeto devuelto por Supabase tras el JOIN entre `obras`, `obras_compositores` y `compositores`.

### Análisis Técnico
- El campo `obras.obras_compositores` es un array.
- La lógica actual intenta acceder a `ro.obras.obras_compositores.compositores.apellido`.
- Al ser un array, se debe buscar el elemento con el rol adecuado (o el primero disponible) y luego acceder al objeto `compositores`.

### Solución Aplicada
1. Corregir el `useMemo` de `obras` en `ProgramSeating.jsx`.
2. Implementar una verificación robusta para extraer el apellido del primer compositor encontrado en el array `obras_compositores`.

### Criterios de Aceptación
- Las columnas del Seating deben mostrar el apellido del compositor real en lugar de "Anónimo".
- Si realmente no existe un compositor vinculado, debe mantenerse un fallback controlado (ej. "S/D").

---

### Estado de Implementación

- [x] SELECT de Supabase en `fetchRepertoire` incluye correctamente `obras (id, titulo, link_drive, obras_compositores (rol, compositores (apellido)))`.
- [x] `useMemo` de `obras` en `ProgramSeating.jsx` resuelve correctamente el array `obras_compositores` y extrae `compositores.apellido`.
- [x] Fallback actualizado a **"S/D"** cuando no hay datos de compositor.

