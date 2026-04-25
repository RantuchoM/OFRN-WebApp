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

## Estética
- Uniforme con el resto de la App.
- Uso del logo: `public/pictures/ofrn.jpg`.
