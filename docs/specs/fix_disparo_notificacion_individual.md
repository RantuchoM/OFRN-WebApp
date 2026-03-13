## Spec: Corrección de Lógica de Disparo - Notificación Individual

### Problema
El alta individual de músicos en una gira no dispara la notificación de bienvenida, a pesar de que el usuario marca la opción en el modal.

### Análisis de Causa Raíz
1. El modal de alta individual captura un flag `sendNotification` asociado al checkbox "enviar notificación".
2. En `GiraRoster.jsx`, la función que procesa el alta individual (`addManualMusician` / handler equivalente) solo realiza el `INSERT` en `giras_integrantes` y refresca el roster.
3. Falta la cadena de ejecución: `Insert exitoso` → `Validación de flag` → `Encolado en la cola de notificaciones` (o llamada explícita al servicio de mails).

### Solución Implementada
- Se documenta y refuerza el contrato de alta individual para que el handler reciba un flag de configuración desde el modal.
- En `GiraRoster.jsx` se actualiza la función de alta individual para que, tras un `INSERT` exitoso en `giras_integrantes`, verifique:
  - Que el flag de notificación (`sendNotification`) venga en `true`.
  - Que la notificación inicial del programa ya haya sido enviada (`localNotificacionInicialEnviada`).
  - Que las notificaciones automáticas sigan habilitadas (`notificacionesHabilitadas`).
  - Que el músico tenga `mail`, y que se disponga de `nombre`, `apellido` o `nombre_completo`.
- Si todas las condiciones anteriores se cumplen, se encola una tarea de tipo `ALTA` en `NotificationQueuePanel`, reutilizando el mismo patrón que el alta masiva y otros cambios de estado.

### Flujo de Datos Esperado
1. **Modal individual** (`AddMusicianModal` en `GiraManipulationModals.jsx`):
   - Expone un checkbox "Enviar notificación de bienvenida".
   - Pasa al callback de confirmación los datos del músico y el flag `sendNotification`.
2. **Handler en `GiraRoster.jsx`**:
   - Inserta el registro en `giras_integrantes`.
   - Si `sendNotification === true` y se cumplen las demás condiciones:
     - Construye el `nombreCompleto` a partir de `nombre_completo` o `apellido` + `nombre`.
     - Encola una tarea en `pendingNotifications` con:
       - `variant: "ALTA"`,
       - `emails: [musician.mail]`,
       - `nombres: [nombreCompleto]`,
       - `reason: "Se te convoca individualmente"`.
3. **`NotificationQueuePanel`**:
   - Consume `pendingNotifications` y llama a la Edge Function `mails_produccion` para disparar el correo de bienvenida, reutilizando los metadatos de la gira (nombre, nomenclador, fechas, zona y link de repertorio).

### Criterios de Aceptación
- Al agregar un músico manualmente con el checkbox de notificación activo:
  - Se crea correctamente el registro en `giras_integrantes`.
  - Se agrega una tarea `ALTA` a la cola de `NotificationQueuePanel`.
  - Se observa en consola/red la invocación a la Edge Function `mails_produccion` correspondiente al envío de la notificación de bienvenida.
- Si el checkbox está desactivado, el alta se realiza pero **no** se encola la notificación individual.

### Estado
- Flujo de alta individual actualizado para respetar el flag de notificación y reutilizar la infraestructura de la cola de notificaciones existente.

