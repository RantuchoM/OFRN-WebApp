# Spec: Optimización UI/UX Centro de Feedback

## Objetivo
Maximizar la densidad de información y mejorar la jerarquía visual del Centro de Feedback (`FeedbackAdmin.jsx`), permitiendo ver 6–8 reportes en pantalla sin scroll en desktop y centralizando controles en una sola línea.

---

## 1. Estructura de Encabezado y Filtros

### Línea única de control
- Todos los filtros (**Tipo**, **Estado**, **Búsqueda**) se alinean en una sola fila superior mediante `flex-row` y `items-center gap-4` (o equivalente `gap-3`).
- Los filtros quedan integrados en la barra superior de la vista (no en un bloque separado debajo de las pestañas).

### Navegación por pestañas
- **Admin:** `Gestión General` (vista por defecto) | `Mis Reportes`.
- **Usuario (no admin):** solo `Mis Reportes` (única vista).
- La vista por defecto para administradores es **Gestión General**; para el resto, **Mis Reportes**.

### Implementación
- Header: título "Centro de Feedback" + botón Recargar en una fila.
- Pestañas: para admin, primero "Gestión General", luego "Mis Reportes"; para usuario solo "Mis Reportes".
- Filtros (solo en Gestión General): una fila con:
  - Búsqueda (input por título, mensaje, email).
  - Filtro por **Tipo** (Sugerencia, Error, Ayuda) con botones tipo pill.
  - Filtro por **Estado** (Pendientes, En Proceso, Resueltos, Descartados) con contadores.
- Lógica de filtrado reactiva: `filteredItems` depende de `searchTerm`, `selectedTypes` y `selectedStatuses`.

---

## 2. Card de Reporte (Layout Horizontal)

### Compactación
- Reducción de paddings y uso de `flex` para distribuir la información en una sola fila por reporte.
- Estructura por fila:
  - **Col 1:** Icono de tipo + ID (truncado, p. ej. últimos 6 caracteres).
  - **Col 2:** Título del reporte (truncado) + badge de estado.
  - **Col 3:** Email del usuario + fecha corta (`dd/MM HH:mm`).
  - **Col 4:** Acciones (Editar / Reabrir, Iniciar, Resolver, Descartar, Comentar según rol y estado).

### Densidad
- Tipografía más pequeña (`text-sm` / `text-xs`) para datos secundarios (email, fecha).
- Altura de fila reducida (`py-2 px-3`) para permitir 6–8 reportes visibles en pantalla en resoluciones desktop sin scroll.

### Detalle expandible
- Clic en la fila expande/colapsa el detalle debajo.
- En el detalle expandido se muestra: mensaje completo, respuesta de administración (si existe), nota admin editable (admin), enlace a captura y ruta de pantalla.
- Al hacer clic en "Resolver" o "Comentar", la fila se expande automáticamente para mostrar el editor de comentarios.

---

## 3. Gestión de Espacio

- En pantallas horizontales (desktop) se aprovecha todo el ancho del contenedor: contenedor principal con `max-w-[1600px]` y `w-full min-w-0`.
- Filtros fijos/integrados en la barra superior (no flotantes).
- Lista con `flex-1 overflow-y-auto min-h-0` para que el scroll sea solo del listado y no de toda la página.

---

## 4. Lógica de Acceso

- El sistema detecta el rol desde `AuthContext` (`useAuth().isAdmin`).
- Si el usuario tiene permisos de gestión (`isAdmin`), la vista por defecto es **Gestión General** (todos los reportes con filtros).
- Usuarios no admin ven solo la pestaña **Mis Reportes** y no tienen acceso a filtros por tipo/estado globales.

---

## 5. Funcionalidad Conservada

- Filtrado por estado y búsqueda de texto (título, mensaje, email) se mantiene y es reactivo a la nueva línea de filtros.
- Filtro por **Tipo** añadido (Sugerencia, Error, Ayuda); valor `BUG` en BD se trata como "Error".
- Cambio de estado (Reabrir, Iniciar, Resolver, Descartar), comentarios de admin y resolución con notificación por email sin cambios.
- En "Mis Reportes", edición de título/mensaje solo en estado Pendiente; modal de edición y envío a `send-feedback-email` con `is_update: true` se mantienen.

---

## Archivos Modificados

- `src/views/Feedback/FeedbackAdmin.jsx`: refactor de encabezado, pestañas, filtros en una línea, tarjetas horizontales compactas con detalle expandible, tipografía reducida y ancho completo.

## Documentación Relacionada

- `docs/specs/feedback-self-management.md`: lógica de negocio (Mis Pedidos, resolución, notificaciones).
