# Spec: Revisión de Lógica de Eliminación (Soft vs Hard Delete)

## Objetivo

Verificar y corregir la eliminación de ensayos en el flujo de Coordinación de Ensambles para que sea **soft delete** (marcado como eliminado) en lugar de **hard delete** (borrado físico), con persistencia del registro y visualización "tachada" durante 24 horas.

---

## 1. Resultado de la Auditoría

### Comportamiento anterior (incorrecto)

| Ubicación | Método | Comportamiento |
|-----------|--------|----------------|
| `IndependentRehearsalForm.jsx` → `handleDelete` | `supabase.from("eventos").delete().eq("id", id)` | **Hard delete**: el registro se borra de la tabla y se pierde la integridad referencial con `eventos_ensambles`, `eventos_asistencia_custom`, etc. |
| `EnsembleCoordinatorView.jsx` → `handleConfirmDeleteRehearsal` (single) | `supabase.from("eventos").delete().eq("id", id)` | **Hard delete** |
| `EnsembleCoordinatorView.jsx` → `handleConfirmDeleteRehearsal` (bulk) | `supabase.from("eventos").delete().in("id", ids)` | **Hard delete** |

### Schema existente (`eventos`)

En `supabase/schema.sql` la tabla `eventos` ya contempla soft delete:

- **`is_deleted`** (boolean, default false)
- **`deleted_at`** (timestamp with time zone, nullable)

No se usa el campo `tecnica` para eliminación; `tecnica` se reserva para otro uso (ensayo técnico). Se utiliza **`is_deleted`** y **`deleted_at`** para el flujo de eliminación suave.

### Integridad referencial

Al pasar de `DELETE` a `UPDATE`:

- Las filas en **`eventos_ensambles`**, **`eventos_asistencia_custom`**, **`eventos_programas_asociados`** siguen referenciando `eventos.id`; no se rompe ninguna FK.
- El registro del evento permanece en la base de datos; solo se marca como eliminado.

---

## 2. Cambios Realizados

### 2.1 IndependentRehearsalForm.jsx

- **`handleDelete`**:
  - Antes: `supabase.from("eventos").delete().eq("id", initialData.id)`.
  - Ahora: `supabase.from("eventos").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", initialData.id)`.
- Mensaje de confirmación: *"¿Marcar este ensayo como eliminado? Se ocultará de la vista activa y se eliminará definitivamente en 24 horas."*
- Toast de éxito: *"Ensayo marcado como eliminado. Se eliminará definitivamente en 24 horas."*

### 2.2 EnsembleCoordinatorView.jsx

- **`handleConfirmDeleteRehearsal`** (eliminación única y masiva):
  - Antes: `supabase.from("eventos").delete().eq("id", id)` / `.delete().in("id", ids)`.
  - Ahora: `supabase.from("eventos").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", id)` (y análogo con `.in("id", ids)`).
- Mensajes de confirmación y toasts actualizados para indicar que el evento "se eliminará definitivamente en 24 horas".
- En casos con vínculos de logística, el aviso incluye también la mención a las 24 h.

### 2.3 Queries de eventos en EnsembleCoordinatorView.jsx

- **Query principal (eventos vía `eventos_ensambles`)**:
  - Se añade **`is_deleted`** al `select` de `eventos`.
  - Se define `today = new Date().toISOString().split("T")[0]`.
  - En el mapeo de resultados se **excluyen** solo los eventos que están eliminados y cuya fecha **no** es hoy: `if (e.is_deleted && e.fecha !== today) return;`.
  - Así se siguen mostrando los eventos marcados como eliminados **solo si su fecha es hoy**, durante el período de 24 h.

- **Query de superposiciones (eventos directos)**:
  - Se añade **`is_deleted`** al `select`.
  - Misma regla en JS: se omiten eventos con `is_deleted === true` y `fecha !== today`.

### 2.4 RehearsalCardItem (dentro de EnsembleCoordinatorView.jsx)

- Se considera **`evt.is_deleted === true`** para el estilo y el mensaje:
  - Clases Tailwind aplicadas al contenedor de la tarjeta: **`line-through opacity-50 grayscale`** cuando el evento está eliminado.
  - Texto informativo debajo del título: *"Se elimina definitivamente en 24 h"* (clase `text-[10px] text-amber-600`).

---

## 3. Resumen de Comportamiento Actual

| Acción | Comportamiento |
|--------|----------------|
| Usuario elimina un ensayo (desde formulario o desde la lista) | Se ejecuta `UPDATE` con `is_deleted: true` y `deleted_at: now()`. No se hace `DELETE`. |
| Listado en Coordinación | Se traen eventos con `is_deleted` en el select; en JS se ocultan solo los que tienen `is_deleted === true` y `fecha !== today`. Los eliminados de **hoy** se muestran con estilo tachado y el texto "Se elimina en 24 h". |
| Feedback al usuario | Confirmaciones y toasts indican que el evento "se eliminará definitivamente en 24 horas". |

---

## 4. Borrado físico (definitivo) a las 24 h

Este documento y los cambios realizados **solo** implementan el **soft delete** y la **visualización** durante 24 h. La eliminación **física** del registro (por ejemplo un job que ejecute `DELETE FROM eventos WHERE is_deleted = true AND deleted_at < now() - interval '24 hours'`) queda fuera del alcance de esta revisión y debería definirse en un proceso/job separado (por ejemplo Supabase Edge Function o cron).

---

## 5. Archivos Modificados

- `src/views/Ensembles/IndependentRehearsalForm.jsx` — `handleDelete` y mensajes.
- `src/views/Ensembles/EnsembleCoordinatorView.jsx` — `handleConfirmDeleteRehearsal`, queries de ensayos y superposiciones, y componente `RehearsalCardItem`.

## 6. Exportaciones: eventos eliminados excluidos

Se aseguró que los eventos con **soft delete** (`is_deleted === true`) **no aparezcan en las exportaciones** oficiales.

| Exportación | Ubicación | Cambio |
|-------------|-----------|--------|
| **PDF Agenda** | `src/utils/agendaPdfExporter.js` | En `exportAgendaToPDF`, la lista de eventos se filtra con `.filter(i => !i.isProgramMarker && !i.is_deleted)` antes de generar la tabla. Cualquier evento tachado en la UI no se imprime en el reporte. |
| **Calendario ICS** | `supabase/functions/calendar-export/index.ts` | La consulta a la tabla `eventos` incluye `.or("is_deleted.eq.false,is_deleted.is.null")`, por lo que solo se procesan eventos no eliminados. No se utiliza ninguna View; la consulta es directa a la tabla. |
| **Excel** | `src/utils/excelExporter.js` | No exporta eventos del calendario (solo viáticos). No requiere cambio. |

No fue necesario actualizar ninguna View en SQL: la Edge Function `calendar-export` consulta directamente la tabla `eventos`.

---

## 7. Referencias

- Schema: `supabase/schema.sql` (tabla `eventos`, columnas `is_deleted`, `deleted_at`).
- Validación de transporte al eliminar: `docs/specs/delete-transport-validation.md`.
