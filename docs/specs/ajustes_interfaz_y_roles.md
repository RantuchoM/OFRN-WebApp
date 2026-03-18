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

