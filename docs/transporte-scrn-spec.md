# Spec: Sistema de Transporte SCRN (Público)

## Resumen
Sección pública para la gestión de flota y solicitudes de transporte de pasajeros. Permite a los usuarios registrarse/loguearse via OTP y solicitar plazas en viajes programados.

## Requisitos de Usuario (UX)
- Login via Magic Code (OTP) al email.
- Perfil: Nombre, Apellido, DNI, Fecha Nacimiento, Cargo, Género.
- Mis Reservaciones: Historial de solicitudes y su estado (Pendiente/Aceptada/Rechazada).

## Requisitos de Admin
- Gestión de Transportes: Camionetas, colectivos, etc.
- Gestión de Viajes: Definición de rutas, fechas y plazas.
- Aprobación: Sistema de "Aceptar/Rechazar" que descuenta plazas del transporte.
- Notificaciones: Recepción de mails ante nuevas solicitudes.

## Lógica de Disponibilidad
- Las plazas disponibles se calculan en tiempo real: `transporte.capacidad_max - reservas_aceptadas`.
- Filtro inteligente por disponibilidad (ej: mostrar solo viajes con >2 lugares).

## Vinculación con Viáticos Manual
- [x] Columnas `viaticos_opciones` (jsonb) en `scrn_reservas`, `scrn_reserva_pasajeros` y `scrn_solicitudes_nuevo_viaje` (migración `20260622120000_scrn_viaticos_opciones.sql`).
- [x] En solicitud de plaza (`SolicitudModal`) y propuesta de recorrido (`ProponerNuevoViajeModal`): bloque opcional por titular y por cada pasajero (% viático, temporada alta, gastos).
- [x] En **Mis viajes** (`MisReservas`): botón **Completar viático** para la persona logueada (titular o pasajero invitado), si el recorrido no está cancelado/rechazado y la salida fue hace menos de 30 días.
- [x] El botón escribe prefill en `sessionStorage` y navega a `/viaticos-manual?prefill=scrn`.
- [x] Al aprobar propuesta de nuevo viaje (`AdminSCRNPanel`), se copian `viaticos_opciones` del proponente a la reserva y de cada item de `pasajeros_json` a `scrn_reserva_pasajeros`.

### Shape `viaticos_opciones`
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

### Utilidades
- `src/utils/scrnViaticoPrefill.js` — mapeo recorrido → campos de viático manual.
- `src/views/Public/TransporteSCRN/ScrnViaticosOpcionesFields.jsx` — UI reutilizable.

## Estética
- Uniforme con el resto de la App.
- Uso del logo: `public/pictures/ofrn.jpg`.
