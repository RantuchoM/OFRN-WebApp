# Spec: Sincronización Granular de Google Drive

## Objetivo
Separar la actualización de metadatos del programa (Nomenclador, Mes_Letra) de la gestión de shortcuts de obras para mejorar el rendimiento y la fiabilidad.

## Acciones en Edge Function
1. `sync_program_metadata`: 
   - Calcula y actualiza `nomenclador` y `mes_letra` en Supabase (limitado estrictamente al `programId` recibido).
   - Solo Sinfónico y Camerata Filarmónica usan `MM` + letra cronológica (p. ej. `03a`) y consumen posiciones del correlativo mensual. Ensamble y los demás tipos no secuenciales usan solo `MM`; Comisión queda vacía.
   - **Comisión** queda fuera de ambos correlativos; al sincronizar una comisión se limpian esos campos si estaban asignados.
   - Crea/Renombra la carpeta principal del programa en Drive (solo la raíz del programa, sin tocar subcarpetas de repertorio).
2. `sync_repertoire_shortcuts`:
   - Gestiona exclusivamente los shortcuts dentro de las subcarpetas de repertorio del programa indicado.
   - Implementa la numeración `01, 02...` y la limpieza de huérfanos (solo dentro del programa indicado).
   - **Obras con `excluir`**: siguen recibiendo shortcut numerado en Drive de la gira. El flag `excluir` solo las oculta del programa público (difusión, duración neta, informes); no debe impedir el acceso de estudio en la carpeta de la gira.

## Interfaz de Usuario
- Se añade un botón de **"Sincronizar Drive"** (icono `RefreshCw`/`IconRefresh`) al lado de **"Importar Repertorio"** en la vista de repertorio del programa.
- Este botón dispara específicamente `sync_repertoire_shortcuts` para el programa activo, mostrando:
  - Loader durante la operación.
  - Toast de éxito o error al finalizar.

## Sincronización global (`sync_program` sin ID)

- **Alcance temporal**: solo programas `estado = 'Vigente'` con `fecha_hasta >= hoy`. Los correlativos se calculan con todo el año fiscal (para no romper la numeración), pero las escrituras en DB y los renombres en Drive se limitan a ese conjunto: los programas pasados quedan con el valor que ya tenían.
- **Lotes por presupuesto de tiempo**: cada programa implica varias llamadas a Drive (carpeta raíz, subcarpetas de repertorio, shortcuts), por lo que un lote grande agotaba el tiempo de la Edge Function y devolvía un error aunque la DB ya estuviera actualizada. La acción sincroniza hasta agotar `budgetMs` (60 s por defecto, configurable en el body) y devuelve los restantes en `pendingIds`.
- **Continuación**: se reinvoca `sync_program` con `programIds: [...]` para procesar el lote pendiente. El frontend (`GirasView.handleGlobalSync`) itera automáticamente hasta que `pendingIds` viene vacío, mostrando el progreso en el toast.
- **Respuesta**: `{ success, synced, total, pending, pendingIds, failedIds, nomencladorUpdated, mesLetraUpdated }`. Un programa que falla se registra en `failedIds` y no bloquea al resto.

## Restricción de Alcance
- Ambas acciones (`sync_program_metadata` y `sync_repertoire_shortcuts`) reciben explícitamente un `programId`.
- Su lógica y efectos están restringidos a ese único programa:
  - En DB, las actualizaciones de nomenclador y mes_letra se limitan al programa indicado.
  - En Drive, solo se crean/renombran carpetas y shortcuts dentro de la jerarquía del programa indicado.

