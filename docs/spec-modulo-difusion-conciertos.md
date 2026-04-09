# Especificación técnica: módulo de seguimiento de difusión de conciertos

## Descripción

Sistema de gestión de estados de difusión para eventos de tipo **Concierto** (`id_tipo_evento = 1`). Permite a roles **admin**, **editor** y **difusión** monitorear y registrar el progreso de la comunicación de cada concierto mediante un log append-only en Supabase.

## Datos (Supabase)

### Tabla `conciertos_difusion_logs`

| Columna        | Tipo        | Notas |
|----------------|-------------|--------|
| `id`           | bigint PK   | Identity |
| `id_evento`    | bigint FK   | `eventos(id)` ON DELETE CASCADE |
| `estado`       | text        | `NULL` o `en_proceso` \| `listo` \| `compartido` (sin valor por defecto) |
| `observaciones`| text        | Opcional |
| `id_editor`    | bigint FK   | `integrantes(id)` |
| `created_at`   | timestamptz | Default `now()` |
| `fecha_snapshot` | date    | Copia de `eventos.fecha` al insertar el log |
| `hora_snapshot` | text     | Copia de `eventos.hora_inicio` al insertar (ej. HH:MM) |
| `locacion_snapshot` | text | Texto de locación al insertar (nombre + localidad) |

Migraciones en el repo: `20260409120000_conciertos_difusion_logs.sql`, `20260409130000_conciertos_difusion_logs_estado_nullable.sql`, `20260409140000_conciertos_difusion_logs_snapshot.sql` (RLS `anon` en la migración base).

Vista general: filtro por **tipo de programa** (`programas.tipo`), no por programa individual. Tabla: Fecha · Hora · Locación · Programa · Estado · Observaciones · Acciones. Si fecha/hora/locación actuales del evento difieren del último log guardado (snapshots), el dato se resalta en naranja con tooltip del último registro.

El estado y las observaciones **mostrados en la UI** provienen del **último** registro por `id_evento` (orden `created_at` descendente). Cada guardado **inserta** una nueva fila (historial completo).

## Componentes en el frontend

| Archivo | Rol |
|---------|-----|
| `src/views/Difusion/DifusionGeneral.jsx` | Vista global: filtros por tipo de programa y rango de fechas; enlace a la pestaña Difusión de la gira (`view=DIFUSION`). |
| `src/components/difusion/ConciertosDifusionPanel.jsx` | Tabla reutilizable: badges de estado, edición inline, `ConfirmModal` al descartar cambios, historial por evento, selección múltiple y edición masiva. |
| `src/components/difusion/MassiveEditModal.jsx` | Modal de estado + observaciones para los eventos seleccionados. |
| `src/App.jsx` | Modo `DIFUSION_GENERAL`, ítem de menú **Difusión** (visible solo para admin, editor o difusión). |
| `src/views/Giras/GiraDifusion.jsx` | Sección **Estado de Difusión de Conciertos** al final, filtrada por `id_gira` de la gira actual. |

## Reglas de acceso (UI)

- Menú y edición: `admin` **o** `editor` **o** `difusion` (el flag `isEditor` del contexto incluye curador; para esta vista se exige el rol explícito `editor` salvo admin/difusión, alineado a la especificación).

## Estilos de estado (Tailwind)

- `en_proceso`: `bg-yellow-100 text-yellow-800`
- `listo`: `bg-green-100 text-green-800`
- `compartido`: `bg-blue-100 text-blue-800`

Eventos con `is_deleted`: filas con opacidad reducida y texto tachado en columnas de contenido.
