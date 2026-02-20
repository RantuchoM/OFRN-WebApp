# Spec: Estado Informativo en Repertorio

## Objetivo
Permitir la carga de obras que no requieren archivo digital (Drive), marcándolas como "Informativas" para diferenciarlas de las solicitudes pendientes o material listo.

## Requerimientos

### 1. Base de Datos
- El campo `estado` en la tabla `obras` debe aceptar el valor `Informativo` (I mayúscula).
- El usuario ya acomodó el enum_type en la base de datos.

### 2. Interfaz

- **WorkForm**: Añadir "Informativo" a las opciones de estado (dropdown/select).
- **RepertoireManager**: Las filas/tarjetas de obras informativas deben mostrarse con un color de acento azul (`text-blue-600`, `bg-blue-50`, `border-blue-400`).
- **Filtros**: El componente de filtrado en `RepertoireView` debe incluir la opción "Informativo".

### 3. Lógica de Negocio
- Una obra en estado "Informativo" no dispara alertas de "Falta archivo en Drive".
- Se utiliza para registro histórico o consultas de instrumentación sin gestión de partituras.

## Implementación

**Fecha:** 18 de febrero de 2025.

### Cambios realizados

1. **WorkForm.jsx**
   - Añadida la opción `<option value="Informativo">Informativo</option>` al select de Estado.
   - La "F. Esperada" sigue mostrándose solo cuando estado es "Solicitud".

2. **RepertoireView.jsx**
   - Añadida la opción "Informativo" al filtro por estado (`<option value="Informativo">Informativo</option>`).
   - En la columna Estado de la lista: cuando `work.estado === "Informativo"` se muestra la etiqueta azul "Informativo" (`bg-blue-50 text-blue-600 border-blue-200`).

3. **RepertoireManager.jsx**
   - **Tabla:** Filas con `obra.estado === "Informativo"` usan `bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-400`.
   - **Tabla – columna Drive:** Para obras informativas se muestra "—" con tooltip "Obra informativa (sin archivo)" (no se muestra alerta de falta de archivo).
   - **Tabla – título:** Badge "INFO" en azul (`bg-blue-100 text-blue-600 border-blue-200`) para estado Informativo; "PEND" en ámbar solo para Solicitud/Pendiente.
   - **Vista tarjetas:** Barra lateral azul (`bg-blue-500`), borde y fondo azul suave (`border-blue-400 bg-blue-50/50`) y badge "INFO" junto al título.

4. **Lógica de negocio**
   - Las obras en estado "Informativo" no se tratan como pendientes de archivo en Drive: en RepertoireManager la celda de Drive muestra "—" en lugar del indicador de falta de enlace.
