# Spec: Fila de Carga Rápida y Semáforo en Dashboard de Arreglos

## Objetivo
Implementar una fila de entrada rápida al final de la tabla de encargos de arreglos y un sistema de codificación por colores basado en el estado y la proximidad de la fecha límite.

## Requerimientos Funcionales
1. **Fila de Carga Rápida (Draft Row):**
   - Una fila fija al final de la tabla con campos vacíos. ✅ Implementado en `ArreglosDashboard` como última fila del `<tbody>`.
   - **Columna 1 (Compositor):** Debe usar `SearchableSelect` cargando datos de la tabla `compositores`. ✅ Carga opciones desde `public.compositores (id, apellido, nombre)` con label `apellido, nombre`.
   - **Resto de Columnas:** Inputs de texto estándar para los detalles del pedido (título, fecha estimada, orgánico, dificultad, observación). ✅ Implementado con `<input>`/`<textarea>`.
2. **Estilizado por Bloques:**
   - Columnas desde el inicio hasta 'Observación': Fondo azul sutil (`bg-blue-50/40`) para indicar la fase de pedido. ✅ Aplicado a las primeras columnas de la tabla (incluida la fila de carga rápida).
3. **Semáforo de Prioridad (Fila Completa):**
   - **Verde:** `estado === 'entregado'`. ✅ Filas con estado `Entregado` se renderizan con `bg-emerald-50`.
   - **Amarillo:** Pendiente (estado base). ✅ Filas pendientes sin fecha cercana usan `bg-yellow-50/30`.
   - **Naranja:** Fecha límite en menos de 7 días. ✅ Calculado a partir de `fecha_esperada` (< 7 días y ≥ 2 días) con `bg-orange-50`.
   - **Rojo:** Fecha límite en menos de 2 días. ✅ Calculado a partir de `fecha_esperada` (< 2 días) con `bg-red-50`.

## Reglas de Negocio
- Los IDs de compositores son numéricos (`integer`). ✅ El `SearchableSelect` guarda el `id` como valor y se inserta en `obras_compositores.id_compositor`.
- La persistencia se realiza mediante un botón de 'Guardar' en la misma fila de draft, similar a la lógica de `RepertoireManager`. ✅ Botón **"Guardar encargo"** inserta en `public.obras` (estado `"Para arreglar"`) y en `public.obras_compositores`.

## Guía de Autoguardado y Guardado
- La fila de carga rápida mantiene un **borrador local en memoria** (estado React) mientras escribís; no se crea ningún registro en base hasta que presionás **"Guardar encargo"**.
- El botón **"Guardar encargo"** valida que haya **Compositor** y **Título**, crea la obra en `obras` y la vincula al compositor en `obras_compositores`, y luego **recarga la tabla** para mostrar el nuevo encargo.
- El botón **"Limpiar"** borra por completo el borrador actual de la fila rápida sin tocar los datos ya guardados en base.

