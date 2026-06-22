## Spec: Reservas de repertorio (placeholders de planificación)



### Objetivo



Permitir slots de planificación en un bloque de programa **sin crear obra en el catálogo** (ej. *"Dos obras corales"*, *"10 min de cuerdas"*), con duración y orgánico estimados que impacten la planificación del concierto. Opcionalmente acumular **obras candidatas** (N:N) visibles solo para editores hasta una asignación definitiva.



### Modelo de datos



- **Tabla**: `repertorio_obras`

- **`id_obra`**: nullable

- **Campos placeholder**:

  - `titulo_placeholder TEXT` — obligatorio si `id_obra IS NULL`

  - `instrumentacion_placeholder TEXT` — orgánico estimado

- **Tabla opciones**: `repertorio_obras_placeholder_opciones` (`20260620180000_…`)

  - `id_repertorio_obra` → FK `repertorio_obras` **ON DELETE CASCADE**

  - `id_obra` → FK `obras` **ON DELETE CASCADE**

  - `orden`, `notas` (opcional)

  - UNIQUE `(id_repertorio_obra, id_obra)`

- **Reutilizados en slot**: `duracion_segundos_concierto`, `notas_especificas`, `en_definicion`, `estado_curaduria`

- **Constraint slot**: obra XOR placeholder (`20260620170000_repertorio_obras_placeholders.sql`)



### Reglas



1. **Creación slot**: modal *Buscar Obra* → **+ Repertorio sin definir**.

2. **Opciones**: editores agregan/quitan obras en `RepertorioPlaceholderManageModal` (pestaña Opciones) o desde catálogo (`RepertoireView` → Asignar → “como opción de slot”).

3. **Visibilidad opciones**: solo editores del programa (fetch anidado condicionado a `isEditor`); el personal ve el slot en solo lectura sin listado de opciones.

4. **Asignación definitiva**: reemplaza el slot por 1..N obras elegidas; borra slot y opciones (CASCADE); reordena `orden` en bloque si hay varias obras.

5. **Eliminar slot**: DELETE en `repertorio_obras` → CASCADE opciones.

6. **Auditoría orgánica**: placeholders siguen en `buildProgramInstrumentationAudit`; opciones **no** (aún no son programa definitivo).

7. **Duplicado gira**: copia campos placeholder (`manage-gira`); copia de opciones pendiente.



### UI



- Badge **A definir** (violeta); badge **N opc.** para editores si hay candidatas.

- **Lista**: solo lectura para todos; editores: lápiz (datos) + lista (opciones).

- **Modal** `RepertorioPlaceholderManageModal`: pestañas Datos / Opciones + asignación definitiva; pestaña Opciones abre `RepertoireWorkPickerModal` (mismo buscador que Agregar Obra) con obras ya elegidas marcadas.

- **RepertoireWorkPickerModal**: buscador compartido (Agregar Obra + opciones placeholder); filtros de orgánico por defecto = máximo convocado en la gira (`lte` por familia).

- **RepertoireView** → `AssignProgramModal`: pestañas **Repertorio definitivo** / **A definir**; listado y formulario «Nueva asociación» aislados por pestaña (al cambiar tab se resetea gira/bloque/slot); en **A definir** el picker de giras filtra solo programas con slots; asignaciones actuales con desasociar; gira searchable; acción de asociar dentro de cada pestaña sin cerrar modal.
  - Historial: badge «Tiene slots a definir»; sección «Opción en slots…» (editores).



### Estado



- [x] Migración placeholders + opciones N:N

- [x] Servicio `repertorioPlaceholderOpciones.js`

- [x] Modal gestión + integración RepertoireManager

- [x] RepertoireView indicadores y asignación como opción

- [x] Asignación definitiva (una o todas las opciones)

- [ ] Copia de opciones al duplicar gira (`manage-gira`)

- [ ] RLS específica (hoy guards frontend)

