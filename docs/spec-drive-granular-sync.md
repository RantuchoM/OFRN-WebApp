# Spec: Sincronización Granular de Google Drive

## Objetivo
Separar la actualización de metadatos del programa (Nomenclador, Mes_Letra) de la gestión de shortcuts de obras para mejorar el rendimiento y la fiabilidad.

## Acciones en Edge Function
1. `sync_program_metadata`: 
   - Calcula y actualiza `nomenclador` y `mes_letra` en Supabase (limitado estrictamente al `programId` recibido).
   - Crea/Renombra la carpeta principal del programa en Drive (solo la raíz del programa, sin tocar subcarpetas de repertorio).
2. `sync_repertoire_shortcuts`:
   - Gestiona exclusivamente los shortcuts dentro de las subcarpetas de repertorio del programa indicado.
   - Implementa la numeración `01, 02...` y la limpieza de huérfanos (solo dentro del programa indicado).

## Interfaz de Usuario
- Se añade un botón de **"Sincronizar Drive"** (icono `RefreshCw`/`IconRefresh`) al lado de **"Importar Repertorio"** en la vista de repertorio del programa.
- Este botón dispara específicamente `sync_repertoire_shortcuts` para el programa activo, mostrando:
  - Loader durante la operación.
  - Toast de éxito o error al finalizar.

## Restricción de Alcance
- Ambas acciones (`sync_program_metadata` y `sync_repertoire_shortcuts`) reciben explícitamente un `programId`.
- Su lógica y efectos están restringidos a ese único programa:
  - En DB, las actualizaciones de nomenclador y mes_letra se limitan al programa indicado.
  - En Drive, solo se crean/renombran carpetas y shortcuts dentro de la jerarquía del programa indicado.

