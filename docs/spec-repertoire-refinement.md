# Spec: Refinamiento de Filtros y UI en Repertoire

## 1. Filtros y Orden en RepertoireView

- **Botón "Solicitudes"**: Los dos controles siguientes (Solicitado por y Orden fecha) están agrupados bajo un único botón "Solicitudes" para no ocupar espacio en la barra. Al hacer clic se despliega un panel con ambos filtros.
- **Comportamiento al usar los filtros**: Al seleccionar **cualquiera** de estos filtros (un solicitante o Asc/Desc de fecha), la vista filtra automáticamente a estado **Solicitud**.

### Filtro por Solicitante
- **Control**: Dropdown "Solicitado por" dentro del panel Solicitudes; permite filtrar obras por el usuario que las pidió.
- **Lógica**: En la lista del filtro solo aparecen usuarios que tienen al menos una obra en estado `Pendiente` o `Solicitud`.
- **Implementación**: Se obtienen los `id_usuario_carga` únicos de las obras con `estado` en `['Solicitud', 'Pendiente']` y se muestra un desplegable con nombre del solicitante; al elegir uno se filtran las obras por ese ID y se fuerza estado "Solicitud".

### Orden por Fecha Estimada
- **Control**: Opción de ordenamiento Asc/Desc dentro del panel Solicitudes, basada en el campo de fecha estimada de resolución (`fecha_esperada`).
- **Comportamiento**: Las obras sin fecha deben quedar al final (tanto en ascendente como en descendente). Al usar Asc o Desc se fuerza el filtro de estado a "Solicitud".
- **UI**: Botones Asc/Desc en el mismo panel desplegable "Solicitudes".

## 2. UI en RepertoireManager (Vista Admin)

### Nota tipo Post-it (notas internas)
- **Quién lo ve**: Solo editores y admins. Se usa `canSeeInternalNotes = isGlobalEditor || isAdmin` (de `useAuth`), de modo que las notas se muestren aunque el componente esté en modo solo lectura (`readOnly={true}`), p. ej. dentro de una Gira.
- **Dónde**: En la celda de la obra (columna título), tanto en la tabla como en la vista por tarjetas.
- **Cuándo**: Solo para obras en estado **Solicitud** o **Pendiente** que tengan texto en `nota_interna`, `observaciones` o `comentarios`.
- **Contenido**: Post-it con ese texto; tooltip al pasar el mouse con el texto completo.
- **BD**: La tabla `obras` tiene `observaciones` y `comentarios` (no tiene columna `nota_interna`). En `fetchFullRepertoire` se solicitan `observaciones` y `comentarios` en el select de `obras` para poder mostrar el post-it.
- **Estilo**: Amarillo suave (yellow-100), borde, ligera inclinación, sombras suaves.

## 3. Reglas de Negocio

- Los filtros son **reactivos** y no requieren recarga de página (todo en cliente sobre la lista ya cargada).
- El post-it solo es visible para roles con permisos de edición; en RepertoireManager se usa el rol global (`isGlobalEditor` o `isAdmin`) para que admins/editores lo vean también cuando la vista está en solo lectura.

## 4. Estilos

- Coherencia con el resto de la aplicación.
- Post-it: Tailwind `yellow-100` de fondo, bordes y sombras suaves; tooltip con el mismo criterio visual.
