# Posibles inconsistencias: ausentes / convocados / roles

Análisis y decisiones sobre estados de gira y roles.

---

## 1. Estados de gira (ausente, confirmado, baja, no_convocado)

### Decisión de producto (2025)

- **No existe la opción "rechazar" una gira.** Si alguien no va, se marca ausente y se llama reemplazo, etc. El estado `rechazado` no se usa en la app.
- **Convocado por regla (familia/ensamble):** la persona puede estar convocada en forma masiva. En ese caso sí se usa el toggle **Presente / Ausente** (marcar la excepción individual: "era esperable por su ensamble pero no se requirió de sus servicios").
- **Agregado individual (no por familia ni ensamble):** no se permite togglear entre ausente y presente. La única acción es **Desconvocar** (quitar del roster), que reemplaza el antiguo "Eliminar manual". Así, **Ausente** solo se usa cuando la persona fue convocada por regla masiva y se marca la excepción individual.

### Implementación en UI

- **RosterTableRow:** Si `m.es_adicional` (agregado individual), en la columna estado se muestra "—" y no hay botón A/P. En acciones solo aparece **Desconvocar** (icono + texto). Si no es adicional (convocado por regla), se muestra el toggle A/P (Ausente/Presente) y el resto de acciones (Liberar plaza, Copiar link).
- **giraStatsCalculators:** Se eliminó `rechazado` de la lista de estados inactivos; solo se consideran `ausente` y `baja`.

### Dónde se usan los estados (referencia)

| Archivo / contexto | Valores "inactivos" |
|--------------------|---------------------|
| **useAgendaData** | `["baja", "no_convocado", "ausente"]` |
| **giraStatsCalculators** | `ausente`, `baja` (sin `rechazado`) |
| **MealsAttendance, GirasTransportesManager, seatingPdfExporter** | `ausente`, `baja` |
| **RoomingManager / MealsManager** | Solo incluyen `estado_gira === "confirmado"` |

---

## 2. Roles (rol_gira)

- **useGiraRoster:** Asigna `rolReal = "musico"` o `"produccion"` (por familia) o `manualData.rol` desde `giras_integrantes.rol`.
- **GiraRoster:** Orden y color por `rolesList.find(r => r.id === m.rol_gira)`.
- **giraUtils, MealsManager, TransportPassengersModal:** Comparan `rol_gira` con strings ("director", "solista", "musico", etc.).

**Recomendación pendiente:** Confirmar en BD si `roles.id` y `giras_integrantes.rol` son numérico o string para unificar uso.

---

## 3. “Convocados” vs “Confirmados”

- **Convocado (evento):** etiquetas del evento (ej. GRP:TUTTI) = quién está convocado a ese evento.
- **Confirmado / Ausente (gira):** `estado_gira` = si la persona confirmó o está ausente en la gira.

"Convocado" = invitado por regla/tags; "Confirmado" = dijo que sí. Ausente solo para excepción individual cuando fue convocado por regla.
