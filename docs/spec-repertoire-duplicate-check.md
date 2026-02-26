## Spec: Prevención de Duplicados en Repertorio (OFRN-WebApp)

### Objetivo
Optimizar el flujo de carga de obras para evitar registros duplicados, priorizando la identificación del autor y mostrando coincidencias en tiempo real.

### Cambios en UI/UX (`WorkForm.jsx`)
1. **Reordenamiento de Campos**
   - **Línea 1**: Compositores, Arregladores y Botón de Creación Rápida (anteriormente en línea 2).
   - **Línea 2**: Título de la Obra y Estado (anteriormente en línea 1).

2. **Panel de Sugerencias (Anti-Duplicados)**
   - Aparecerá debajo del campo **"Título"**.
   - Se activa cuando el usuario escribe **más de 3 caracteres** en el título **y** hay al menos un compositor seleccionado.
   - Mostrará una lista de obras existentes con el mismo nombre del mismo autor.

### Lógica Técnica
- **Trigger:** `useEffect` dependiente de `formData.titulo` y `selectedComposers`.
- **Query (referencia SQL):**

```sql
SELECT id, titulo, instrumentacion 
FROM obras 
WHERE titulo ILIKE %target% 
AND id IN (
  SELECT id_obra 
  FROM obras_compositores 
  WHERE id_compositor IN (...selected)
);
```

---

### Estado de Implementación

- [x] Reordenamiento de campos en `WorkForm.jsx` (Compositores/Arregladores + botón arriba; Título/Estado en segunda línea).
- [x] Implementación de `useEffect` dependiente de `formData.titulo` y `selectedComposers` para disparar la búsqueda.
- [x] Búsqueda en Supabase en la tabla `obras` usando `ILIKE` sobre el título y filtrando por compositores seleccionados.
- [x] Panel de alerta anti-duplicados debajo del campo de título, con estilos Tailwind (`bg-amber-50`) y `IconAlertCircle` de Lucide Icons.
- [x] Debounce aplicado a la búsqueda para no saturar Supabase.

