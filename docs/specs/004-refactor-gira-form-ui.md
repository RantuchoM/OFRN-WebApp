# Spec: Refactorización de Interfaz y UX en GiraForm

## 1. Cambios Estructurales (Header)
- [x] Mover el selector de **Estado** (`estado`) a la línea del título principal "Configuración de Gira".
- [x] Implementar un sistema de **Background Dinámico**: Si `estado === 'Vigente'`, el contenedor principal tiene un fondo tenue según el tipo de programa (Sinfónico, Ensamble, etc.).

## 2. Optimización de Espacio (Grid System)
- [x] Reorganizar la fila de fechas y ubicación:
  - Fechas del programa en resumen de solo lectura + botón **Modificar fechas** (`md:col-span-4`).
  - `zona` y `LocationMultiSelect` en la misma fila para aprovechar el espacio horizontal.
- [x] En dispositivos móviles (`sm` y menores), todos los campos de datos generales ocupan una sola columna (`col-span-12` / ancho completo).

## 3. Integración de Difusión
- [x] Añadir un nuevo campo `textarea` al final de la sección "Datos Generales" titulado **"Observaciones para Difusión y Redes"**.
- [x] Vincular este campo con `otros_comentarios` de la tabla `gira_difusion`.
- [x] Implementar guardado automático para este campo en la tabla correcta (`gira_difusion`) usando `upsert` por `id_gira`.

## 4. Estilos y Responsive
- [x] Se mantiene la grilla con `md:grid-cols-12` para control de columnas en desktop.
- [x] El fondo dinámico usa opacidades bajas (`/30`) para preservar legibilidad.

## 5. Panel Modificar Fechas (rango y traslado)
- [x] `fecha_desde` / `fecha_hasta` **no** son inputs editables en la grilla: resumen de solo lectura + **Modificar fechas**.
- [x] Panel inline con modos: **Solo inicio**, **Solo fin**, **Ambas**, **Trasladar gira** (sin Trasladar si `isNew`).
- [x] Modos inicio/fin/ambas: validan `fecha_desde <= fecha_hasta`; persisten con update a `programas` + `syncSingleSegmentDates` (**no** mueven eventos). Si hay eventos, aviso de usar Trasladar para correr la agenda.
- [x] Modo Trasladar: `moveGira` (Edge `manage-gira`); checkbox notificar; mail vía `notifyGiraMoveByEmail` (ver `docs/specs/gira-move-clean-v2.md`). Prop opcional `onAfterMove`.
- [x] Validación de orden también en `GirasView.handleSave` y `GiraFormEditPortal.handleSave`.
- [x] Eliminado el stub “Trasladar Gira” / `alert("En desarrollo")` del header.
