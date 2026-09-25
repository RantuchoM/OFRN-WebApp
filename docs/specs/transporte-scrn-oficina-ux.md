# Spec: Mejoras de oficina en transporte-scrn y viáticos-manual

Fecha: 2026-09-25. Complementa `docs/transporte-scrn-ux-flujo.md` y `docs/specs/rendiciones-manual-flow.md`.

## Hecho

- [x] **Fecha y hora.** Los `datetime-local` de recorridos (`ViajeFormFields`) y el turno de limpieza / fecha-hora de control (`ViajeControlVehiculoModal`) usan `DateInput` + `TimeInput`. Con `confirmPicker` / `showClear` se puede limpiar y aceptar. Viáticos y rendiciones usan el mismo modo en sus campos de fecha y hora. El string guardado del viaje no cambia (`YYYY-MM-DDTHH:mm`).
- [x] **Moneda.** Gastos de viáticos, opciones de viático en transporte y celdas anticipado/rendido de rendiciones muestran pesos es-AR (`ArsAmountInput`). El anticipo de viáticos sigue calculado (no es un input).
- [x] **Navegación.** Tabs Transporte, Viáticos y Rendiciones en las tres pantallas. En transporte, secciones Inicio / Explorar / Mis viajes / Mis paquetes visibles en desktop.
- [x] **Export.** En Mis viajes, botón **Exportar viático**. En Viáticos, selector de un viaje propio (reservas del usuario) que precarga la planilla para el PDF.
- [x] **Usuarios admin.** Pestaña Usuarios en Gestión. Se ven perfiles `scrn_perfiles`, se editan con el lápiz ya existente y el rol es solo Usuario o Admin (`es_admin`). No hay otros roles. La columna Mail muestra el correo de `auth.users` (o `entrada_auth_email_user`) vía `scrn_admin_list_user_emails`, solo para admin.
- [x] **Acceso.** En transporte-scrn y viáticos-manual la persona elige **Contraseña** o **Código único** (`OficinaExternaAccessForm`). El código es el OTP de 8 dígitos de un solo uso (`request_code` / `verify_code`). La contraseña entra en `supabaseOficinaExterna` (GoTrue, o `sso_ofrn` / `bootstrap_ofrn_password` con la clave de integrante). La sesión es la misma en las tres pantallas.
- [x] **Estética.** Viáticos y rendiciones usan el mismo lienzo, header, tabs y botones institucionales que transporte (`scrn-shell`, `#0054a6`, ángulos rectos). No se copian mapa ni recorridos. El anticipo y el formato `$ 1.234,56` no cambian.

## Fuera de alcance

- No se tocó `calcValorDiarioProporcional` ni la celda calculada de anticipo de viáticos.
- El alta de perfil propio (`EditarPerfilScrnModal`) no permite cambiarse el rol a sí mismo.
