# Spec: Exportación CNRT - Inclusión Total de Pasajeros

## Objetivo
Garantizar que el archivo de exportación para la CNRT incluya a la totalidad de los integrantes asignados a un transporte, sin importar si tienen definidas paradas de subida o bajada en la tabla de rutas.

## Lógica de Cambio
1. **Origen de Datos**: La exportación CNRT se basa en `giras_transportes.pasajeros_ids` como fuente principal de integrantes del transporte.
2. **Fallback de Fuente**: Si `pasajeros_ids` no está disponible, se usa el roster enriquecido (`passengerList`) con la asignación logística al transporte seleccionado.
3. **Fallback de Paradas**: Si un pasajero no tiene una regla de parada específica para el tramo seleccionado:
   - Se usa por defecto el evento "Desde" (`startId`) como subida.
   - Se usa por defecto el evento "Hasta" (`endId`) como bajada.
4. **Filtro de Exclusión**: Se elimina la lógica que excluía pasajeros por falta de `subidaId` o `bajadaId`.

## Estado
- [x] Implementado en `src/views/Giras/GirasTransportesManager.jsx`.
- [x] Alineado también en `src/views/Giras/DataIntegrityIndicator.jsx` para mantener consistencia de exportación CNRT en ambos flujos.

---

## Hoja de Ruta (PDF / Excel)

### Objetivo
Exportar por transporte una hoja de ruta con paradas, listas de suben/bajan y total a bordo, en PDF o Excel.

### Archivos
- `src/utils/roadmapExport.js` — datos (`buildRoadmapExportData`), alineación viáticos (`resolveViaticosAlignedStops`), generadores PDF/Excel.
- `src/views/Giras/CnrtExportModal.jsx` — modal compartido; checkbox «Alinear con viáticos» solo en hoja de ruta (`showAlignViaticos`).
- `src/views/Giras/GirasTransportesManager.jsx` — `handleExportRoadmap` respeta `exportFormat` (`pdf` por defecto).

### Fix PDF
- Antes el modal enviaba `exportFormat` pero el handler siempre generaba Excel.
- Ahora `generateRoadmapPdf` produce el `.pdf` con la misma información que el Excel.

### Opción «Alinear con viáticos»
Cuando está activa, por cada pasajero del transporte:

**Si localidad de viáticos ≠ residencia** (viáticos explícito distinto): subida y bajada según regla de la **localidad de viáticos**, igual que en sus planillas. **Anula** la parada personal (alcance Persona/Integrante).

**Si viáticos coincide con residencia** (o no hay viáticos explícito):
1. **Regla Persona/Integrante** en ese transporte → se mantienen `subidaId` / `bajadaId` de logística.
2. Reglas de ruta del transporte para la localidad de viáticos: Localidad → Región → General (`findBestRouteRule`).
3. Último recurso: logística actual.

La alineación usa reglas Localidad → Región → General; el **aviso previo** solo exige regla de alcance **Localidad** por ciudad de viáticos (las reglas General/Región no lo silencian).

Antes de exportar, con alineación activa el modal muestra en línea si falta regla Localidad para alguna ciudad de viáticos en el tramo (recorrido completo o parcial). Por defecto se exporta el **recorrido completo**; la opción **Recorrido parcial** despliega los selectores Desde/Hasta. En export alineado: cabecera sin nota de evento; columna **NOMBRE** sin localidad entre paréntesis.

### Estado Hoja de Ruta
- [x] PDF funcional.
- [x] Excel sin cambio de comportamiento (checkbox desmarcado).
- [x] Alinear con viáticos (subida y bajada).
- [ ] `DataIntegrityIndicator.jsx` aún usa solo Excel (pendiente reutilizar util).
