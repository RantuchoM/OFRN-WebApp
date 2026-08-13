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
- [x] Exportación CNRT respeta `exportFormat` del modal (`pdf` por defecto, `excel` opcional) vía `downloadStyledPassengers` en `transportExport.js`.
- [x] Alineado también en `src/views/Giras/DataIntegrityIndicator.jsx` para mantener consistencia de exportación CNRT en ambos flujos (legacy; pendiente migrar a utils).

---

## Hoja de Ruta (PDF / Excel)

### Objetivo
Exportar por transporte una hoja de ruta con paradas, listas de suben/bajan y total a bordo, en PDF o Excel.

### Archivos
- `src/utils/transportExport.js` — lista CNRT estilizada (`downloadStyledExcel`), cronograma solo paradas (`generateStopsOnlyPdf` / `generateStopsOnlyExcel`), paradas combinadas (`exportCombinedStops`). Lazy-load de `exceljs` / `jspdf`.
- `src/utils/roadmapExport.js` — datos (`buildRoadmapExportData`), alineación viáticos (`resolveViaticosAlignedStops`), generadores PDF/Excel (lazy-load de libs pesadas).
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

### Chips Suben/Bajan — localidades inferidas (viáticos ≠ residencia)

A veces se carga una regla de **Localidad** solo para que «Alinear con viáticos» tome la logística de esa ciudad (pasajeros cuya loc. de viáticos ≠ residencia). Esa regla no suma pax reales en el chip (la logística de transporte sigue usando residencia).

- **Solo inferidos**: chip **celeste** (`sky`), sin alerta naranja. Número superior y etiqueta: `{n} inf.` / `Localidad ({n} inf.)`.
- **Mixto** (algunos suben/bajan por residencia y otros solo por viáticos): chip verde/rojo habitual. Número superior y etiqueta: `{m} y {n} inf.` / `Localidad ({m} y {n} inf.)`.
- **Cero reales y cero inferidos**: sigue el warning naranja `0`.
- Una localidad con inferidos **no** dispara el auto-ocultar de paradas «solo bajada».

Mismo criterio en **`StopRulesManager`**: chip de afectados `{n} inf.` / `{m} y {n} inf.` en celeste; lista expandida marca inferidos; no muestra warning ámbar ni el estado vacío «ninguna persona coincide» si hay inferidos. Helpers: `viaticosDiffersFromResidencia` / `personWithViaticosAsResidence` en `integranteDomicilioViaticos.js`.

### Estado Hoja de Ruta
- [x] PDF funcional.
- [x] Excel sin cambio de comportamiento (checkbox desmarcado).
- [x] Alinear con viáticos (subida y bajada).
- [x] Chips Suben/Bajan: localidades solo-viáticos en celeste con `{n} inf.` / `{m} y {n} inf.` (número superior y etiqueta).
- [x] `StopRulesManager`: mismo criterio de inferidos en chip y lista expandida.
- [ ] `DataIntegrityIndicator.jsx` aún usa solo Excel (pendiente reutilizar util).
