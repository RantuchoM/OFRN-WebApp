# Spec: Herramienta de Viáticos Manual para Oficina Externa

## Objetivo
Proveer una interfaz de carga única y manual de viáticos que permita exportar el PDF oficial sin requerir inicio de sesión ni conexión con la base de datos de integrantes de la OFRN.

## Requisitos Técnicos
1. **Acceso Público**: La ruta `/viaticos-manual` no debe estar protegida por el `AuthContext`.
2. **Login unificado**: Misma sesión OTP y perfil (`scrn_perfiles`) que `/transporte-scrn` (`supabaseOficinaExterna`, storage `sb-ofrn-oficina-externa-session`).
3. **Sin Firma Digital**: El campo de firma en el PDF se exportará vacío para firma ológrafa posterior.
3. **Cálculos Locales**:
   - Días computables automáticos mediante `calculateDaysDiff`.
   - Subtotal = Días * (Valor Base * Factor Temporada * % Viático).
   - Valor diario base desde `viaticos_valor_diario_vigencia` (no editable manualmente).
4. **Campos del Formulario**:
   - Personales: Apellido, Nombre, DNI, Cargo, Jornada, Ciudad Origen.
   - Comisión: Motivo, Lugar, Fecha/Hora Salida, Fecha/Hora Llegada.
   - Financieros: % Viático (100/80/0), Switch Temporada (30%).
   - Transporte: Terrestre, patente oficial, detalle.
   - Gastos: Alojamiento, Pasajes, Combustible, Otros, Capacitación, Movilidad otros, Ceremonial.

## Prefill desde Transporte SCRN
- [x] Query `?prefill=scrn` en `/viaticos-manual` consume payload de `sessionStorage` (`SCRN_VIATICO_PREFILL_SESSION_KEY`).
- [x] Origen: botón **Completar viático** en `/transporte-scrn` → Mis viajes.
- [x] Si la planilla ya tiene datos, se pide confirmación antes de reemplazar.
- [x] Se persiste metadata `scrn_origen` en `datos` del viático guardado: `{ reserva_id, pax_id, viaje_id, rol: "titular"|"pasajero" }`.
- [x] Mapeo implementado en `src/utils/scrnViaticoPrefill.js`.

## Mapeo de Exportación
Se utilizará `exportViaticosToPDFForm` enviando un objeto que cumpla con la interfaz esperada por el helper, extrayendo los valores directamente del estado del formulario.

- [x] **Total = total de la pantalla (2026-09-25):** el PDF usa `totalFinal` ya calculado en la vista. No se vuelve a sumar `gasto_pasajes` y `gastos_movilidad` (el manual cargaba el mismo importe en los dos) ni se deja afuera el ceremonial. Pasajes va solo en `gasto_pasajes` → campo `gasto_movilidad`.
- [x] **Actualización silenciosa (2026-09-25):** al abrir `/viaticos-manual` o `/rendiciones-manual`, si hay un build nuevo se recarga la página sola, sin el banner «Actualizar versión». Mismo criterio que `/entradas` (`isSilentVersionUpdateRoute`).
- [x] **Dos vigencias (2026-09-25):** si el viaje cruza más de un valor diario, la pantalla muestra cada rango (fechas, días × valor ponderado y subtotal del tramo), el mismo par que rellena `plantilla_viaticos_multiples.pdf` (`dias_computados` / `valor_diario` y `dias_computados1` / `valor_diario1`). Un solo valor sigue `plantilla_viaticos.pdf` y un único importe en pantalla. El anticipo es la suma de los tramos, no días × promedio. Cada vigencia dura tres meses, así que un viaje es siempre un tramo o dos; las dos líneas de la plantilla múltiple cubren el cruce.

## Estado
- **Ruta pública lista**: `/viaticos-manual` renderiza la vista sin pasar por `ProtectedRoute`/`AppContent` (login OTP opcional para guardado en nube).
- **Puente SCRN**: implementado (ver `docs/transporte-scrn-spec.md`).
