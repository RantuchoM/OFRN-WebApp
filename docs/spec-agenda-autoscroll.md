# Spec: Auto-scroll al Evento Actual en UnifiedAgenda

## Objetivo
Mejorar la UX permitiendo que el usuario vea inmediatamente el evento que está ocurriendo "ahora" al abrir la agenda, con una línea dinámica que indica el instante actual.

## Zona horaria
Se utiliza la **hora y fecha local del navegador** (dispositivo del usuario), sin forzar un huso (p. ej. GMT-3). Así la comparación con `hora_inicio` y `hora_fin` coincide con el reloj que ve el usuario. Funciones: `getCurrentTimeLocal()`, `getTodayDateStringLocal()`.

## Definición de "Último evento iniciado" y evento actual
- **Último evento iniciado**: Entre los eventos de hoy con `hora_inicio <= hora_actual`, el de mayor `hora_inicio`.
- **Evento actual (para filtro/scroll)**: Si estamos **dentro** de ese evento (aún no ha terminado), es ese evento; si ese evento **ya terminó** (tiene `hora_fin` y `hora_actual > hora_fin`), el "actual" para colapsar y scroll es el **siguiente** evento (el que está por comenzar).

## Posición de la línea verde "ahora"

1. **Último evento tiene `hora_fin` y ya terminó**  
   La línea se dibuja **entre** ese evento y el siguiente: una franja delgada entre los dos bloques con la línea horizontal.

2. **Último evento tiene `hora_fin` y aún no termina**  
   La línea va **dentro** del bloque del evento en posición proporcional al tiempo transcurrido:  
   `progress = (hora_actual - hora_inicio) / (hora_fin - hora_inicio)` → `top: progress * 100%`.

3. **Último evento no tiene `hora_fin`**  
   La línea va **dentro** del bloque del evento, con proporción calculada entre el inicio de este evento y el **inicio del siguiente**:  
   `progress = (hora_actual - hora_inicio) / (hora_inicio_siguiente - hora_inicio)` (limitado a 0..1). Si no hay siguiente, se usa una hora de referencia (p. ej. +1 h).

Se usa una única estructura `linePlacement`: `{ type: 'inside', eventId, progress }` o `{ type: 'between', prevId, nextId }`.

## Estilo de la línea
- Color verde suave (`bg-emerald-500/90`), sombra ligera.
- **Titileo lento** (animación `agenda-now-line-pulse` ~2,5 s) para indicar que es dinámica sin resultar molesta. Definida en `src/index.css`.

## Filtro "eventos anteriores de hoy" y scroll
- Por defecto se ocultan los eventos de hoy que terminan antes de que empiece el evento actual. Botón **"Ver eventos anteriores de hoy"** al inicio del día.
- **Al pulsar "Ver eventos anteriores de hoy"** se muestran todos los eventos del día y la vista **se queda arriba** (inicio del día); **no** se hace scroll al evento actual.
- El auto-scroll al evento actual solo se ejecuta al cargar la agenda y cuando **no** hay eventos anteriores (es decir, cuando el evento actual es el primero del día). Así se evita que la barra sticky del día tape el evento.

## Eventos completos visibles
- El bloque del evento actual lleva `scroll-mt-24` para que, al hacer scroll, la barra flotante del día no tape el evento.

## Estado de implementación
- [x] Documento de especificación (este archivo).
- [x] Hora/fecha local del navegador.
- [x] Detección del último evento iniciado y `linePlacement` (inside / between).
- [x] Línea entre eventos cuando el último ya terminó; proporcional sin `hora_fin` usando el siguiente.
- [x] Contenedor con `data-event-id` por evento.
- [x] Sin scroll al pulsar "Ver eventos anteriores"; scroll solo cuando no hay anteriores.
- [x] Línea con titileo lento (`animate-agenda-now-line`).
