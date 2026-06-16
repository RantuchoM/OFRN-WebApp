# Especificación: Ajustes de Interfaz y Alternancia de Roles

## 1. Barra de Navegación (Command Bar)
- **Tamaño**: Reducir el padding y max-width en `App.jsx`.
- **Visibilidad**: Aplicar clases `hidden md:block` / `hidden md:flex` al contenedor de la barra vinculada a Ctrl+K para que no ocupe espacio en móviles.

## 2. Alternancia de Roles de Sistema
- **Funcionalidad**: Permitir que usuarios con roles elevados (admin, editor, difusion) conmuten su vista activa a `musico` para previsualizar su agenda personal.
- **Persistencia**: Se usará `localStorage` con la llave `pref_rol_{userId}`.
- **Botón "Predeterminado"**: En el menú de selección, una opción permitirá marcar el rol actual como el de inicio.
- **Integridad**: Al cargar la app, el sistema verificará si el rol guardado sigue siendo válido según los permisos reales del usuario en la base de datos. Si un editor pierde sus permisos, el sistema ignorará el valor de caché y volverá al rol base.

## 3. Selector "Ver como..." en Móvil
- **Ajuste**: En `UnifiedAgenda.jsx`, remover la clase `hidden` o restricciones de ancho que limiten la visibilidad del selector de músicos en pantallas pequeñas, asegurando que los admins puedan simular otros usuarios desde el celular.

## 4. Banner de cumpleaños
- **Estado**: Completado (2026-06-15). Ampliado (2026-06-16).
- **Comportamiento**: Banner flotante fijo arriba al centro cuando hay integrantes **Estables** vigentes (`fecha_baja` nula o futura, sin `es_simulacion`) cuya `fecha_nac` coincide con el día actual.
- **Texto**: `🎂 Hoy cumple años {Nombre A.} 🥳` (singular) o `🎂 Hoy cumplen años {lista} 🥳` (plural; nombre + inicial de apellido, unidos con comas y «y»).
- **Cierre**: botón ✕ con fondo, borde y mayor área clickeable; guarda en `localStorage` (`ofrn:birthday-banner-dismissed`) la fecha del día; no vuelve a mostrarse en ese dispositivo hasta el día siguiente.
- **Sidebar**: se agrega un botón de torta junto a modo oscuro y escala de interfaz. Abre un modal en portal (`document.body`, `z-[100]`) con cumpleaños de hoy y próximos 30 días.
- **Listado ampliado**: el modal reutiliza los filtros del banner (Estables vigentes, sin simulación) y ordena por días restantes; separa "Hoy" y el rango futuro visible.
- **Carga incremental**: el modal incluye el botón **"Ver un mes más"**. Cada click suma 30 días al rango visible y vuelve a consultar con esa ventana ampliada.
- **Implementación**: `BirthdayBanner.jsx`, `BirthdaySidebarControl.jsx`, `BirthdayUpcomingModal.jsx`, `useBirthdaysToday.js`, `useUpcomingBirthdays.js`, `birthdayUtils.js`; montado en `ProtectedApp` (`App.jsx`).

## 5. Filtros por defecto en "Ver como..." (Agenda)
- **Estado**: Completado (2026-06-11)
- **Comportamiento**: Al elegir un integrante en el selector local de `UnifiedAgenda`, los filtros se reinician según los permisos de esa persona (no según los del editor ni el `localStorage` del integrante simulado).
- **Músico / personal**: `Solo mi transporte` y `Solo mis comidas` activos (también dentro de una gira en modo simulación); sin categoría Logística (id 3).
- **Editor / gestión / técnico**: filtros globales (en gira: todas las categorías permitidas; sin filtros personales).
- **Salir de "Ver como"**: restaura los filtros guardados del usuario logueado.
- **Implementación**: `deriveAgendaPermissions` en `src/utils/agendaPermissions.js`; `useAgendaFilters` recibe `isViewAsMode` y permisos efectivos desde `UnifiedAgenda`.

