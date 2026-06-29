# Spec: Fila de Carga Rápida y Semáforo en Dashboard de Arreglos

## Objetivo
Implementar una fila de entrada rápida al final de la tabla de encargos de arreglos y un sistema de codificación por colores basado en el estado y la proximidad de la fecha límite.

## Requerimientos Funcionales
1. **Fila de Carga Rápida (Draft Row):**
   - Se abre desde el botón **«Encargar arreglo»** en la cabecera del dashboard (solo admin/editor). La fila aparece al inicio del `<tbody>`, con pulso/ring indigo ~3,5 s para indicar dónde cargar el encargo.
   - **Cancelar:** cierra la fila y limpia el borrador. Tras guardar con éxito también se cierra.
   - **Columna 1 (Compositor):** Debe usar `SearchableSelect` cargando datos de la tabla `compositores`. ✅ Carga opciones desde `public.compositores (id, apellido, nombre)` con label `apellido, nombre`.
   - **Resto de Columnas:** Inputs de texto estándar para los detalles del pedido (título, fecha estimada, orgánico, dificultad, observación). ✅ Implementado con `<input>`/`<textarea>`.
2. **Estilizado por Bloques:**
   - Columnas desde el inicio hasta 'Observación': tinte azul muy suave (`bg-sky-50/20`) sobre el fondo de semáforo de la fila.
3. **Semáforo de Prioridad (Fila Completa):**
   - Fondo suave (`bg-*-50/35`–`/40`) con borde de acento fuerte: `border-l-4` en escritorio (fila de tabla) y `border-2` en tarjetas móviles.
   - **Verde:** `estado === 'entregado'` u `oficial` → ámbito esmeralda.
   - **Ámbar:** Pendiente sin urgencia de fecha.
   - **Naranja:** Fecha límite en menos de 7 días.
   - **Rojo:** Fecha límite en menos de 2 días.
   - Columnas de pedido (hasta Observación): tinte `bg-sky-50/20` sobre el fondo de fila.

## Reglas de Negocio
- Los IDs de compositores son numéricos (`integer`). ✅ El `SearchableSelect` guarda el `id` como valor y se inserta en `obras_compositores.id_compositor`.
- La persistencia se realiza mediante un botón de 'Guardar' en la misma fila de draft, similar a la lógica de `RepertoireManager`. ✅ Botón **"Guardar encargo"** inserta en `public.obras` (estado `"Para arreglar"`) y en `public.obras_compositores`.
- **Eliminación de encargo (admin/editor):** En filas con estado `Para arreglar`, botón **Eliminar** abre `ConfirmModal` (portal, `z-[100]`) advirtiendo que se borrarán todos los registros del arreglo. Al confirmar, se eliminan en cascada manual las tablas hijas (`seating_asignaciones`, `repertorio_obras`, `obras_produccion_log`, `obras_palabras_clave`, `obras_particellas`, `obras_arcos`, `obras_compositores`) y luego la fila en `obras`. Solo disponible para `isAdmin` o `isEditor`.
- **Orden de la tabla:** Pendientes (`Para arreglar`) arriba por `fecha_esperada` ascendente (más urgente primero; sin fecha al final del bloque pendiente). `Entregado` y `Oficial` siempre al final, ordenados por `fecha_entrega` descendente (más reciente primero); sin fecha de entrega al final de ese bloque, alfabético por título.
- **Paginación:** 25 arreglos por página (client-side sobre la lista filtrada/ordenada); controles al pie de la tabla.
- **Vista móvil (`md:hidden`):** lista de tarjetas con estado, fechas, título, compositor y arreglador; tap abre `ArregloMobileDetailModal` (portal `z-[100]`) con edición inline de campos del encargo y acciones (referencias, entregar, editar obra, eliminar / nueva versión). **Encargar arreglo** en móvil abre `ArregloQuickEncargoModal` en lugar de la fila rápida de escritorio.
- **Búsqueda en columna Obra:** Input con lupa en el encabezado «Obra / Compositor · Arreglador»; filtra por substring en título, compositor o arreglador.
- **Filtro por arreglador:** Botón con icono de embudo en la cabecera; al pulsarlo se despliega el listado de arregladores (sin `<select>` visible). Resalta en indigo si hay filtro activo.
- **Legacy Germán Lema:** Migración `20260628120000_arreglos_legacy_lema_backfill.sql` — backfill `id_integrante_arreglador = 4340365` e inserta `obras_produccion_log` para obras arregladas por Lema (vía `id_arreglador`, `obras_compositores` o integrante) que aún no estén en el flujo de arreglos. Log de entrega con `fecha = 2025-12-31` (Entregado/Oficial) o `NULL` (otros estados); nunca `now()` para no tapar entregas reales de 2026.
- **Solicitado por:** Tag violeta debajo de la fecha estimada (`integrantes!id_usuario_carga`). El mail `encargo_arreglo` incluye fila **Solicitado por** con ese nombre (`detalle.solicitado_por`). **Asignado por** (cabecera del mail) = usuario de la sesión que envía.
- **Referencias de material:** Tabla `public.arreglos_referencias`. Tipos en toggle segmentado: obra (`IconMusic`), YouTube (`IconYoutube`), Drive/enlace (`IconDrive`). Obras del archivo muestran orgánico (`instrumentacion`) bajo el título.
- **Dificultad en WorkForm:** Campo editable en el bloque «Para arreglar» (junto a fecha estimada); se persiste en `obras.dificultad` y viaja en el mail de encargo.
- **Mail de asignación:** Columna `obras.encargo_arreglo_mail_enviado_at` (timestamptz). Tras envío exitoso en `WorkForm` o fila rápida del dashboard se persiste la marca; reenvío exige confirmación en WorkForm.

## Columnas de la tabla (refactor UX entrega)
- **F. est.:** Primera columna (izquierda). Fecha estimada editable inline si admin/editor; días restantes y tag solicitante debajo.
- **Obra / Compositor · Arreglador:** Columna ancha. Título editable con `WysiwygEditor` (mismo componente que `WorkForm`, modo `compact`); visualización respeta HTML enriquecido sin bold forzado.
- **Ref., Orgánico, Dificultad, Observación:** Sin cambios de datos; observación del pedido usa `ObservacionesStickyCell` (post-it amarillo al focus).
- **Acciones:** Gestión de entrega condensada. Pendiente: botones apilados **Editar** / **Entregar** (modal) / **Eliminar**. Entregado/Oficial: post-it con estado + fecha de entrega (`obras_produccion_log`), post-it de nota `[Entrega]` si existe, iconos carpeta/editar, botón **Nueva versión**.
- **Entrega Drive:** Al marcar entregado, `manage-drive` acción `entregar_obra_archivo` copia el link de origen a la carpeta compartida **«Para acomodar»** (mismo flujo que el botón del WorkForm: nombre canónico `Apellido-Arreglador - Título` o `Apellido, I. - Título`). Si el link ya está bajo «Para acomodar», no duplica y solo actualiza estado + mail. Errores de permiso Drive devuelven `DRIVE_ACCESS_DENIED`.

## Guía de Autoguardado y Guardado
- La fila de carga rápida mantiene un **borrador local en memoria** (estado React) mientras escribís; no se crea ningún registro en base hasta que presionás **"Guardar encargo"**.
- El botón **"Guardar encargo"** valida que haya **Compositor** y **Título**, crea la obra en `obras` y la vincula al compositor en `obras_compositores`, y luego **recarga la tabla** para mostrar el nuevo encargo.
- El botón **"Limpiar"** ya no existe; **"Cancelar"** cierra la fila y borra el borrador local sin tocar datos guardados en base.

