# Spec: Autogestión de Feedback y Notificaciones de Ciclo Cerrado

## Objetivo
Permitir que los integrantes de la OFRN gestionen sus propios reportes de feedback y reciban notificaciones automáticas cuando sus pedidos sean resueltos por administración.

## Lógica de Negocio

1. **Filtro Personal:** En `FeedbackAdmin`, los usuarios verán una sección "Mis Pedidos" filtrada por su email (extraído del `AuthContext`).

2. **Edición de Pedidos:**
   - Un usuario puede editar el `titulo` y `mensaje` solo si el `estado` es 'Pendiente'.
   - Al editar, se debe disparar la Edge Function `send-feedback-email` con un flag `is_update: true`.

3. **Resolución por Admin:**
   - Al cambiar el estado a 'Resuelto', el administrador debe poder completar `admin_comments`.
   - El guardado de esta resolución dispara la Edge Function con el flag `is_resolution: true`.

4. **Notificaciones (Edge Function):**
   - Si `is_update`: Mail a administración avisando de cambios en un pedido existente.
   - Si `is_resolution`: Mail al `user_email` original con el comentario del admin.

## Esquema
- Tabla: `public.app_feedback`
- Campos clave: `id`, `user_email`, `estado`, `admin_comments`, `titulo`, `mensaje`.

## Vista FeedbackAdmin

- **Pestañas:**
  - **Administración:** visible solo para roles admin. Tabla completa con filtros, cambio de estado y comentarios de admin.
  - **Mis Pedidos:** visible para todos. Lista filtrada por `user_email` (coincidencia con email del usuario logueado).

- **Mis Pedidos:**
  - Botón "Editar" en registros con `estado === 'Pendiente'`.
  - Modal (Portal) para editar `titulo` y `mensaje`. Al guardar: update en BD e invocación de `send-feedback-email` con el registro actualizado y `is_update: true`.

- **Administración – Resolución:**
  - Al seleccionar estado "Resuelto", se habilita el input para `admin_comments`.
  - Al guardar (estado + comentario), invocar `send-feedback-email` con `is_resolution: true` y `admin_comments`.

## Edge Function `send-feedback-email`

### Invocación desde BD (trigger)
Sin cambios: el trigger envía el payload con `record` (registro nuevo). Se envía mail a administración con asunto "Nuevo Feedback".

### Invocación desde la app (POST body)

| Parámetro        | Tipo    | Descripción |
|------------------|---------|-------------|
| `record`         | objeto | Registro de `app_feedback` (incluye `id`, `user_email`, `titulo`, `mensaje`, `tipo`, `ruta_pantalla`, etc.). |
| `is_update`      | boolean | Si `true`: envía mail a administración con asunto "MODIFICACIÓN DE PEDIDO" y detalle del pedido actualizado. |
| `is_resolution`  | boolean | Si `true`: envía mail al usuario (email extraído de `record.user_email`, p. ej. "Nombre (email@...)" → `email@...`) notificando que su pedido fue resuelto e incluyendo el comentario de administración. |
| `admin_comments` | string  | Opcional. Usado cuando `is_resolution: true`; se incluye en el cuerpo del mail al usuario. |

- Si solo se envía `record` (sin flags): se trata como nuevo reporte y se envía mail a admins (comportamiento legacy/trigger).
- Si `is_update === true`: mail a admins con "MODIFICACIÓN DE PEDIDO".
- Si `is_resolution === true`: mail a `user_email` (extraído) con "Tu pedido fue resuelto" y `admin_comments`.

**Envío de correo:** La función usa las mismas credenciales de Google que el resto de Edge Functions (`GMAIL_USER`, `GMAIL_PASS`) vía nodemailer; no usa Resend.

## Acceso a la vista Feedback

- El ítem "Feedback" en el menú lateral se muestra a **todos los roles excepto invitado** (músicos, consulta_personal, admin, etc.). Solo el rol **invitado** (guest) no ve el ítem. Dentro de la vista, solo los **admin** ven la pestaña "Administración"; el resto solo ve "Mis Pedidos".

## UX e iconografía (FeedbackAdmin y Widget)

### Identificador izquierdo de la tarjeta (estado)
El color de la barra vertical izquierda de cada tarjeta indica el **estado** del pedido (no el tipo):

| Estado      | Color   | Clase (Tailwind)        |
|------------|---------|--------------------------|
| PENDIENTE  | Naranja | `border-l-amber-500`     |
| EN_PROCESO | Azul    | `border-l-blue-500`      |
| RESUELTO   | Verde   | `border-l-emerald-500`   |
| DESCARTADO | Gris    | `border-l-slate-400`     |

Así el usuario (y el admin) ve de un vistazo si el pedido aún no se está procesando, está en proceso o ya está resuelto.

### Tipos de feedback: iconos y colores
El **tipo** (Sugerencia, Error, Ayuda) se muestra con un badge que incluye icono + texto, con colores consistentes:

| Tipo       | Icono           | Color (estética)     |
|------------|------------------|----------------------|
| Sugerencia | Notepad (clipboard) | Verde (`emerald`)  |
| Error      | Símbolo de error (alert circle) | Rojo            |
| Ayuda      | Signo de pregunta (help circle)   | Amarillo (`amber`) |

- **FeedbackAdmin:** en cada tarjeta, el badge del tipo usa `TIPO_CONFIG` (IconClipboard / IconAlertCircle / IconHelpCircle) y las clases de color correspondientes. Compatible con valor legacy `BUG` (se muestra como Error).
- **FeedbackWidget:** en el selector de tipo al crear un pedido, cada opción muestra el mismo icono y color (Sugerencia verde, Error rojo, Ayuda amarillo).

### Resumen
- Barra izquierda = **estado** (naranja / azul / verde / gris).
- Badge con icono = **tipo** (Sugerencia notepad verde, Error icono error rojo, Ayuda signo ? amarillo).

---

## Email de resolución al usuario (contenido)

Cuando se envía el mail de resolución (`is_resolution: true`), el cuerpo incluye:

1. **Asunto:** "Tu pedido de feedback fue resuelto" + título del pedido.
2. **Tipo del pedido:** bloque con estética según tipo (verde Sugerencia, rojo Error, amarillo Ayuda) para que el usuario recuerde en qué categoría lo envió.
3. **Tu mensaje:** el texto original del pedido (`record.mensaje`) en un bloque destacado, para que el UX pueda recordar qué pidió.
4. **Comentario de administración:** la respuesta de administración (`admin_comments`).

La Edge Function `send-feedback-email` aplica en el HTML del mail los mismos criterios de estilo por tipo (fondo y borde verde/rojo/ámbar) para el bloque "Tipo".

---

## Estado
- **Completado:** Implementado pestañas (Mis Pedidos / Administración), edición de pedidos Pendientes con modal y notificación por `is_update`, resolución con `admin_comments` y notificación al usuario por `is_resolution`. Edge Function actualizada para ambos flujos.
- **Completado (UX/email):** Barra izquierda por estado (naranja/azul/verde); iconos por tipo en Admin y Widget; email de resolución con tipo y mensaje del pedido y estética por tipo.
