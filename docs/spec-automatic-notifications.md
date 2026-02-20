# Spec: Sistema de Notificaciones de Convocatoria (Flujo de Publicación)

## 1. Estado de la Gira: Borrador vs. Publicada

- Una gira (programa) puede tener la **notificación inicial** pendiente o ya enviada.
- Columna en `programas`: `notificacion_inicial_enviada` (boolean, default false).
- Mientras `notificacion_inicial_enviada` es **false**:
  - La gira se considera en "modo Borrador" para notificaciones: **no** se envían mails individuales por altas/bajas/ausencias.
  - Se muestra un **Banner de Notificación Inicial** en la vista de Roster.
- Cuando `notificacion_inicial_enviada` es **true** (gira "Publicada" en cuanto a notificaciones):
  - Se activan las **notificaciones individuales** (cola de 15s) para cambios puntuales.

## 2. Notificación Inicial (Massive Launch)

- **Acción**: Enviar un mail a todos los integrantes con estado `confirmado` en la gira.
- **Contenido**: Texto claro de convocatoria con enlace al repertorio de la gira.
- **Efecto**: Tras envío exitoso:
  - Se actualiza `programas.notificacion_inicial_enviada = true` para esa gira.
  - Se inserta un registro en `giras_notificaciones_logs` con `tipo_notificacion = 'INITIAL_BROADCAST'`.
- **Canal**: Edge Function `mails_produccion` con variante `INITIAL_BROADCAST` (template `convocatoria_gira`).

## 3. Notificaciones Individuales (Post-Publicación)

- Solo si `notificacion_inicial_enviada === true`.
- **NotificationQueuePanel**: Cola con ventana de **15 segundos** para agrupar cambios (altas, bajas, ausencias).
- **Variantes**: `ALTA`, `BAJA`, `AUSENTE` (textos claros en el mail según el caso).
- **Integración**: Misma Edge Function `mails_produccion`, template `convocatoria_gira`, con `data.variant` y destinatarios correspondientes.

## 4. UI/UX

- **Banner superior** (cuando la notificación inicial no fue enviada):  
  Estilo amber (bg-amber-50, border-amber-200). Texto: "La notificación inicial de esta gira aún no ha sido enviada" y botón **"Notificar a todos ahora"**.
- **Panel flotante** de tareas pendientes cuando hay items en la cola (gira ya publicada).
- **Bloqueo de salida**: No permitir salir de la vista Roster (onBack) si hay envíos individuales pendientes en la cola (procesos de 15s sin haber flusheado).

## 5. Datos y tablas

- **programas**: `notificacion_inicial_enviada boolean DEFAULT false`.
- **giras_notificaciones_logs**: `id`, `id_gira` (FK programas), `tipo_notificacion` (texto: 'INITIAL_BROADCAST', 'INDIVIDUAL_ALTA', etc.), `enviado_at` (timestamptz).

## 6. Resumen de flujo

1. Gira nueva → `notificacion_inicial_enviada = false` → Banner visible; cambios en roster no generan mails.
2. Usuario hace clic en "Notificar a todos ahora" → se envía mail a confirmados (INITIAL_BROADCAST) → se marca `notificacion_inicial_enviada = true` y se registra en logs.
3. A partir de ahí, cada alta/baja/ausencia se encola en el panel; cada 15s se envían los mails individuales (convocatoria_gira + variant).
4. Si el usuario intenta "Volver" y hay tareas pendientes en cola, se bloquea (o se advierte) hasta que se envíen o se cancele.
