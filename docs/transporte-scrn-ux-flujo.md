# Flujo UX — Transporte SCRN (`/transporte-scrn`)

> Documento de proceso UX. Complementa la spec técnica `docs/transporte-scrn-spec.md`
> y el contrato de prefill de `docs/specs/tool-viaticos-oficina.md`.

## 1. Panorama general

Ruta pública independiente (`src/views/Public/TransporteSCRN/`) para gestionar la flota
y las solicitudes de transporte de pasajeros y paquetes de la SCRN.

- **Cliente Supabase**: `supabaseOficinaExterna` (proyecto oficina externa).
- **Sesión compartida** con `/viaticos-manual` y `/rendiciones-manual`
  (storage `sb-ofrn-viaticos-manual-session`). Loguearte en uno te loguea en el otro.
- **Estado ↔ URL**: los parámetros `view`, `area`, `ex`, `adminView`, `pSec`, los filtros
  (`transporte`, `fechaDesde`, `fechaHasta`, `destino`, `minDisponibles`) y los deep-links
  de acción (`?action=solicitar&viajeId=…`, `?action=proponer`) se serializan al query string.

Archivos clave:

| Rol | Archivo |
|---|---|
| Gate de acceso / login | `TransporteSCRNPage.jsx`, `LoginSCRN` |
| App principal | `TransporteSCRNMain.jsx` |
| Solicitar plaza | `SolicitudModal.jsx` |
| Proponer viaje | `ProponerNuevoViajeModal.jsx` |
| Enviar paquete | `EnviarPaqueteModal.jsx` |
| Mis viajes | `MisReservas.jsx` |
| Mis paquetes | `MisEnvios.jsx` |
| Panel admin | `AdminSCRNPanel.jsx` |
| Opciones de viático (UI) | `ScrnViaticosOpcionesFields.jsx` |

## 2. Recorrido del usuario (UX)

1. **Acceso** (`TransporteSCRNPage.jsx`): login por magic-link (`?magic=<token>`,
   `verifyEntradasMagicLink({ app: "scrn" })`) y carga de perfil desde `scrn_perfiles`.
   Si no hay perfil → pantalla de alta de perfil (`LoginSCRN`).
2. **Header** (siempre visible, sticky): branding + Inicio (desktop) · Pendientes (admin,
   badge) · Notificaciones · Perfil · Salir. En móvil, la navegación principal de áreas
   vive en un **bottom bar** (Inicio · Explorar · Viajes · Paquetes).
3. **Landing (`area = inicio`)**: saludo, tarjetas de navegación → Gestión (admin) · Explorar ·
   Mis viajes · Mis paquetes; bloque opcional “Próximas salidas” (top 3).
4. **Explorar (`area = explorar`)**:
   - Menú de 3 acciones: *Enviar un paquete* · *Sumarme a un viaje* · *Proponer un viaje*.
   - Toolbar: modo activo · toggle Calendario/Agenda · filtros colapsables (vehículo,
     fechas, destino, mín. plazas) + limpiar + *Proponer*.
   - **Calendario** (`react-big-calendar` + `scrnTransporteLayout.css`): mes responsive,
     eventos coloreados, 🔴/🟡/🟢 de vacantes, anillos según estado de reserva, `popup` show-more.
   - **Agenda** (grilla de tarjetas): ruta, motivo, plazas/bodega, fechas, transporte, chofer,
     CTA contextual. Toggle *Ver historial*.
   - Disponibilidad en vivo: `cupoPasajerosViaje(viaje) − reservasAceptadas`.
5. **Mis viajes (`area = viajes` → `MisReservas`)**: reservas propias, edición de paradas/viáticos,
   cancelación y botón **Completar viático** (puente a viáticos-manual, ver §4).
6. **Mis paquetes (`area = envios` → `MisEnvios`)**: envíos propios.
7. **Gestión (`view = gestion`, admin → `AdminSCRNPanel`)**:
   - *Pendientes*: aprobar/rechazar propuestas de viaje, reservas de pasajeros y paquetes.
   - *Recorridos*: alta/edición de viajes e historial.
   - *Datos generales*: transportes, localidades, usuarios.

## 3. Qué información se gestiona/carga en una "solicitud"

Dos flujos, ambos persisten `viaticos_opciones` (JSONB) para prealimentar viáticos-manual.

### A) Solicitar plaza en un viaje existente — `SolicitudModal.jsx`
Escribe en `scrn_reservas` (titular) y `scrn_reserva_pasajeros` (acompañantes).

- **Paradas**: recorrido completo (default) o cambiar paradas → `tramo` (ida/vuelta/ambos),
  `localidad_subida` / `localidad_bajada` (acotadas al corredor vía RPC `scrn_paradas_entre`),
  y observaciones libres (`obs_subida`, `obs_bajada`).
- **Solicitar plaza para**: uno o varios pasajeros:
  - perfiles existentes (dropdown `scrnPerfiles`),
  - invitados nuevos (nombre + apellido + email → se crea perfil con `ensureScrnPerfilForNewEmail`),
  - el usuario actual incluido por defecto (removible para solicitar solo para terceros).
  - Se valida contra `plazasDisponibles`.
- **Opciones de viático** (opcional, por titular y por acompañante) — `ScrnViaticosOpcionesFields`:
  `% viático` (100/80/0), *Temporada alta +30%*, y 7 montos de gasto.
- **Estado**: `aceptada` si admin, `pendiente` si no (dispara mail vía `mails_produccion`
  a `filarmonica.scrn@gmail.com`, template `scrn_transporte_evento`).

### B) Proponer un viaje nuevo — `ProponerNuevoViajeModal.jsx`
Escribe en `scrn_solicitudes_nuevo_viaje`. Campos (`ViajeFormFields`):

- `id_transporte`, `id_chofer`, `motivo`, `origen`, `destino_final`,
  `fecha_salida`, `fecha_llegada_estimada`, `fecha_retorno`, `observaciones`,
  `paquetes_bodega_llena`, `plazas_pasajeros`.
- Paradas + lista de acompañantes (`pasajeros_json`) + `viaticos_opciones` por persona.
- Valida conflicto de ocupación del transporte (`viajeTransporteConflict.js`) y tope de capacidad.

### Shape de `viaticos_opciones`
```json
{
  "porcentaje": 100,
  "temporada_alta": false,
  "gasto_alojamiento": 0,
  "gasto_pasajes": 0,
  "gasto_combustible": 0,
  "gasto_otros": 0,
  "gastos_capacit": 0,
  "gastos_movil_otros": 0,
  "gasto_ceremonial": 0
}
```

## 4. Articulación con `viaticos-manual`

Integración **desacoplada** (rutas separadas, sin árbol de componentes ni contexto compartido),
en tres capas:

1. **Auth unificada**: mismo cliente Supabase, misma clave de sesión y perfiles unificados
   en `scrn_perfiles` (migración `20260622140000_oficina_externa_auth_unify.sql`).
2. **Modelo compartido `viaticos_opciones`**: columnas JSONB en `scrn_reservas`,
   `scrn_reserva_pasajeros` y `scrn_solicitudes_nuevo_viaje`
   (migración `20260622120000_scrn_viaticos_opciones.sql`).
3. **Puente "Completar viático"** (mecanismo de apertura), en `MisReservas.jsx`:

```
MisReservas → botón "Completar viático" (elegible: no cancelado/rechazado y salida ≤ 30 días atrás)
   → buildScrnViaticoPrefill(viaje, reserva/pax, perfil, viaticos_opciones, rol)
   → writeScrnViaticoPrefill()   [sessionStorage: ofrn_scrn_viatico_prefill]
   → navigate("/viaticos-manual?prefill=scrn")
ViaticosManual.jsx → effect lee ?prefill=scrn
   → readAndClearScrnViaticoPrefill() + quita el query param
   → si la planilla ya tiene datos: ConfirmDialog "¿Reemplazar planilla con datos del transporte?"
   → applyScrnPrefill() → planilla completada, metadata scrn_origen conservada
```

`buildScrnViaticoPrefill` (`src/utils/scrnViaticoPrefill.js`) mapea:
persona (nombre/apellido/dni/cargo), `motivo`, `lugar_comision`,
fechas/horas según `tramo` (`resolveFechasComision`), `%`/temporada/7 gastos desde
`viaticos_opciones`, flags de transporte (`check_terrestre`, `check_patente_oficial`,
`patente_oficial`, `transporte_otros_detalle`), y metadata de trazabilidad
`scrn_origen = { reserva_id, pax_id, viaje_id, rol }`.

**Características del handoff**: unidireccional (SCRN → viáticos), de un solo uso por navegación
(guardado con `scrnPrefillHandledRef`). El viático completado **no** se escribe de vuelta en
la reserva SCRN.

## 5. Deuda técnica y propuestas de mejora

### Deuda técnica detectada
- **Handoff sin retorno** — *mitigado*: *Mis viajes* ahora muestra un badge
  "✓ Viático generado" derivado de los viáticos del usuario que apuntan a la reserva/pax
  (`datos.scrn_origen`), sin write-back ni migración (ver `docs/specs/scrn-viatico-retorno.md`).
  Pendiente: visión del titular sobre viáticos de sus pasajeros (requeriría write-back real).
- **Migraciones manuales**: el feature depende de scripts SQL corridos a mano
  (`docs/transporte-scrn-*.sql`). Si falta una tabla/columna, la UI muestra guías en vez de fallar,
  lo que enmascara el estado real del esquema.
- **Doble lógica de conteo de pasajeros**: `refreshData` mantiene una rama legacy (`conEstadoPax`)
  para reservas sin `estado` por pasajero, sumando complejidad a la matemática de disponibilidad.
- **Prefill efímero** — *mitigado*: ahora el prefill viaja por el estado de navegación de React Router
  (`navigate(state)`) y `sessionStorage` queda solo como respaldo (que se limpia siempre). Persiste el
  caso de abrir `/viaticos-manual` en otra pestaña, que sigue dependiendo del respaldo efímero.
- **Duplicación del shape de viático** — *parcialmente resuelto*: las claves de gasto se centralizaron
  en `VIATICO_GASTO_KEYS` (`viaticosManualStorage.js`), consumidas por `scrnViaticoPrefill.js` y
  `hasMeaningfulViaticoData`. Falta unificar el `DEFAULT_FORM` completo de viáticos con el shape SCRN.
- **Ruta pública fuera de `ProtectedRoute`**: el gate es propio del feature; conviene auditar que
  ningún endpoint quede expuesto sin verificación de perfil.

### Propuestas de mejora
- **Retorno del viático a SCRN** — *aplicado (derivado)*: badge "Viático generado" en *Mis viajes*
  por coincidencia de `datos.scrn_origen`. El write-back real (`viatico_id` en tablas SCRN) queda
  pendiente solo si se necesita visión cruzada titular↔pasajeros.
- **Contrato de viático compartido**: extraer el shape y los mapeos a un único módulo tipado
  (o JSDoc) consumido por ambos features para evitar divergencias.
- **Migraciones versionadas**: consolidar los `.sql` sueltos en migraciones de `supabase/migrations`
  y eliminar los hints de "corré este script".
- **Persistencia del prefill más robusta** — *aplicado (in-app)*: `navigate(state)` como canal primario
  con respaldo en `sessionStorage`. Pendiente evaluar un registro efímero en DB con TTL para el caso
  cross-tab.
- **Simplificar disponibilidad**: migrar por completo al conteo por `estado` de pasajero y retirar
  la rama legacy.
- **Feedback de disponibilidad en tiempo real**: suscripción `realtime` de Supabase a
  `scrn_reservas` para actualizar plazas sin recargar.
- **Tests de integración del puente** SCRN → viáticos (build → write → read → apply) para blindar
  el contrato ante refactors.
- **UX shell responsive** — *aplicado*: bottom nav móvil, filtros colapsables, agenda en grilla,
  calendario estilizado, home con próximas salidas.
- **Estética institucional RN** — *aplicado*: ángulos rectos + azul `#0054a6` alineado al
  lenguaje visual de [rionegro.gov.ar](https://rionegro.gov.ar/).
