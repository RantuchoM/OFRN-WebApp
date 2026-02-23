# Spec: Validación de Eliminación de Eventos de Transporte

## Objetivo
Prevenir la eliminación accidental de eventos de transporte (ID 11 y 12) que actúan como hitos para el cálculo de viáticos (subidas/bajadas).

## Lógica de Validación

### 1. Detección
Al intentar eliminar un evento, se verifica si su `id_tipo_evento` es:
- **11** (Transporte Ida)
- **12** (Transporte Vuelta)

### 2. Chequeo de Dependencias y Detalle Afectado
Si el evento es de tipo transporte:
- Se consulta la tabla **`giras_logistica_reglas_transportes`** para comprobar si el `id` del evento está referenciado en **`id_evento_subida`** o **`id_evento_bajada`**.
- Se resuelve **qué** se afecta usando la utilidad **`getTransportEventAffectedSummary`** (`src/utils/transportLogisticsWarning.js`):
  - Por cada regla se lee **alcance** (`Persona`, `Localidad`, `Region`, `General`, `Categoria`).
  - Se obtienen nombres de **integrantes** (nombre/apellido), **localidades** (localidad) y **regiones** (region) vía consultas a `integrantes`, `localidades` y `regiones`.
- El mensaje de confirmación incluye explícitamente: *"Afecta a: Personas: X, Y. Localidades: A, B. Regiones: Z."* (según corresponda), para que el usuario sepa exactamente qué reglas se impactan.

### 3. Confirmación de Usuario
- **Sin vínculos**: se muestra el mensaje estándar (ej. "¿Eliminar este evento?" o "¿Mover a la papelera?").
- **Con vínculos**: se muestra un mensaje de advertencia que **incluye el detalle** (localidades, personas, regiones afectadas) y la consecuencia sobre viáticos.
- Se usa siempre **ConfirmModal** (o equivalente); no `window.confirm`.
- Solo si el usuario confirma (o si el evento no tiene vínculos) se ejecuta la eliminación/soft-delete en Supabase.

### 4. Feedback
- Tras una eliminación exitosa que **sí** tenía vínculos de logística, se muestra un toast de advertencia:
  - *"Evento eliminado. Revisá la logística de integrantes/regiones y creá un evento nuevo para viáticos si corresponde."*
- El flujo de eliminación usa `toast.promise` (loading → success/error) para mantener una experiencia fluida.

## Ubicación en el Código

- **Utilidad compartida**: `src/utils/transportLogisticsWarning.js`
  - **`getTransportEventAffectedSummary(supabase, eventId)`**: devuelve `{ hasLinks, detail }` donde `detail` es un texto con "Personas: …", "Localidades: …", "Regiones: …" según las reglas que referencian el evento.

- **Vista Coordinación**: `src/views/Ensembles/EnsembleCoordinatorView.jsx`
  - **Función**: `handleDeleteRehearsal(id, eventOptional)` — usa la utilidad, muestra **ConfirmModal** con mensaje que incluye el detalle afectado (localidades, personas, regiones).

- **Vista Agenda (papelera)**: `src/components/agenda/UnifiedAgenda.jsx`
  - **Flujo**: al hacer clic en eliminar desde el formulario de evento, `handleDeleteEvent` usa `getTransportEventAffectedSummary` y abre **ConfirmModal** con el mensaje de papelera más el detalle de qué reglas afecta (personas, localidades, regiones) si aplica.

### Puntos de invocación (Coordinación)
- **RehearsalCardItem**: `onDelete(evt.id, evt)`.
- **EventQuickView**: el padre llama `handleDeleteRehearsal(id, viewingEvent)`.

## Resumen Técnico

| Aspecto           | Detalle                                                                 |
|------------------|-------------------------------------------------------------------------|
| Tabla logística  | `giras_logistica_reglas_transportes`                                    |
| Columnas usadas  | `id_evento_subida`, `id_evento_bajada`, `alcance`, `id_integrante`, `id_localidad`, `id_region` |
| Tipos transporte| `id_tipo_evento` 11 (Ida), 12 (Vuelta)                                  |
| Detalle en mensaje | Personas (nombre/apellido), Localidades, Regiones, General             |
| Confirmación     | **ConfirmModal** (no `window.confirm`)                                 |
| Toast post-borrado | `toast.warning` cuando la eliminación impactó en logística              |

## Estado
**Implementado**: validación con detalle de reglas afectadas en `EnsembleCoordinatorView.jsx` y `UnifiedAgenda.jsx`; utilidad en `transportLogisticsWarning.js`; ConfirmModal y toasts en ambos flujos.
