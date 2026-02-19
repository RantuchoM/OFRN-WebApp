# Spec: Optimización de Rendimiento y Estabilidad en UnifiedAgenda

## Problema
La agenda se redibuja completamente ante cualquier cambio en un evento, afectando la experiencia de usuario en móviles donde el "layout shift" es crítico.

## Objetivos
1. Implementar **Debouncing** en la carga de datos para evitar ráfagas de peticiones.
2. Utilizar **React.memo** y `useCallback` en los items de la agenda para evitar redibujos innecesarios.
3. Asegurar que solo el evento modificado se actualice en el estado local antes de un refetch completo (Optimistic UI parcial).

## Reglas de Implementación
- Los eventos deben compararse por su `id` y `updated_at`.
- El componente `UnifiedAgenda` debe usar un `useEffect` con un pequeño delay (**500 ms**) para ráfagas de cambios (realtime).
- La vista móvil debe preservar la posición del scroll mediante el uso de **keys estables** (ID numérico del evento) y evitar el retorno de `null` o loaders de pantalla completa durante la actualización.
- Indicador de carga sutil (barra superior o overlay) cuando hay datos en pantalla; spinner completo solo en carga inicial sin datos.

## Técnica

### Debouncing
- Ref o timeout para agrupar múltiples triggers de fetch (realtime, filtros, etc.).
- Tras 500 ms de calma, ejecutar un único fetch.

### React.memo y props
- Componentes que representan bloques por día o por evento deben estar envueltos en `React.memo`.
- Comparación de props: por `evt.id` y `evt.updated_at` cuando aplique, para que solo el evento modificado provoque re-render del ítem.

### Keys
- Usar siempre el **ID numérico del evento** (`evt.id`) como `key` en listas de eventos.
- Evitar índices o keys compuestas que cambien entre renders.

### Carga y scroll en móviles
- No desmontar la lista ni mostrar un loader de pantalla completa durante una actualización en segundo plano.
- Preferir barra superior (“Sincronizando…”) o overlay discreto cuando `isRefreshing` o `loading` con datos existentes.
- Spinner o mensaje centrado solo cuando `loading && items.length === 0` (primera carga).

---

## Estado de implementación

- [x] PASO 1: Documento de especificación (este archivo).
- [x] PASO 2: Debounce 500 ms en triggers de fetch (realtime).
- [x] PASO 2: React.memo en bloques (TourDivider memoizado).
- [x] PASO 2: Keys estables (ID numérico del evento: `key={evt.id}`).
- [x] PASO 2: Loader sutil en móvil (barra superior "Actualizando..." cuando hay datos; sin desmontar contenido).
- [x] PASO 3: Lecciones aprendidas (scroll en móviles).

---

## Lecciones Aprendidas

### Scroll en móviles durante el re-renderizado

1. **No desmontar el contenido durante la actualización**  
   Si se muestra un loader de pantalla completa o se retorna `null` mientras llegan nuevos datos, el scroll vuelve al inicio y se produce un salto brusco (layout shift). En móvil esto es muy visible. La solución aplicada: mantener siempre la lista montada y mostrar un indicador sutil (barra superior "Actualizando..." o "Sincronizando...") cuando `loading` o `isRefreshing` son true y ya hay datos en pantalla.

2. **Keys estables**  
   Usar siempre el **ID numérico del evento** (`evt.id`) como `key` en las listas de eventos evita que React recree nodos innecesariamente y ayuda a preservar el scroll y el foco. Evitar índices (`key={index}`) o keys compuestas que cambien entre renders.

3. **Debouncing del refetch**  
   Las suscripciones en tiempo real (p. ej. Supabase) pueden emitir varios eventos seguidos. Ejecutar un fetch por cada uno genera ráfagas de peticiones y múltiples re-renders. Un único refetch tras **500 ms de calma** (cancelando el timer anterior en cada nuevo evento) reduce carga y parpadeos.

4. **useMemo para datos derivados**  
   `groupedByMonth` se calcula a partir de `filteredItems`. Envolverlo en `useMemo` con dependencia `[filteredItems]` evita recalcular en cada render cuando los filtros o los items no han cambiado, reduciendo trabajo y posibles parpadeos al hacer scroll.

5. **React.memo en componentes de bloque**  
   Envolver en `React.memo` los componentes que representan bloques (p. ej. separadores de gira, `TourDivider`) asegura que solo se re-rendericen cuando sus props cambien. Para listas muy largas de eventos, una optimización adicional sería extraer cada fila de evento a un componente memoizado que reciba el evento y un contexto estable (p. ej. por `evt.id` / `evt.updated_at`), de modo que solo la fila modificada se actualice en actualizaciones optimistas.
