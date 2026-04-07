# Spec: Refactorización de Interfaz y UX en GiraForm

## 1. Cambios Estructurales (Header)
- [x] Mover el selector de **Estado** (`estado`) a la línea del título principal "Configuración de Gira".
- [x] Implementar un sistema de **Background Dinámico**: Si `estado === 'Vigente'`, el contenedor principal tiene un fondo tenue según el tipo de programa (Sinfónico, Ensamble, etc.).

## 2. Optimización de Espacio (Grid System)
- [x] Reorganizar la fila de fechas y ubicación:
  - `fecha_desde` y `fecha_hasta` ocupan `md:col-span-3` cada una.
  - `zona` y `LocationMultiSelect` se ubican en la misma fila para aprovechar el espacio horizontal.
- [x] En dispositivos móviles (`sm` y menores), todos los campos de datos generales ocupan una sola columna (`col-span-12` / ancho completo).

## 3. Integración de Difusión
- [x] Añadir un nuevo campo `textarea` al final de la sección "Datos Generales" titulado **"Observaciones para Difusión y Redes"**.
- [x] Vincular este campo con `otros_comentarios` de la tabla `gira_difusion`.
- [x] Implementar guardado automático para este campo en la tabla correcta (`gira_difusion`) usando `upsert` por `id_gira`.

## 4. Estilos y Responsive
- [x] Se mantiene la grilla con `md:grid-cols-12` para control de columnas en desktop.
- [x] El fondo dinámico usa opacidades bajas (`/30`) para preservar legibilidad.
