# Spec: Optimización Móvil - Módulo de Datos Maestros

## Objetivo

Hacer que la gestión de tablas maestras sea funcional en dispositivos móviles, sustituyendo la barra lateral por un menú desplegable y garantizando la navegabilidad de las tablas.

## Cambios en DataView.jsx

1. **Selector de Tabla**: En pantallas `sm` y `md`, la lista de botones se ocultará y aparecerá un `<select>` de HTML5 o un componente de dropdown estilizado que cambie el `activeTab`.
2. **Layout Flexible**: Cambiar `flex-row` por `flex-col` en móvil. El área principal debe ocupar el resto de la altura disponible (`h-[calc(100vh-200px)]`).

## Cambios en UniversalTable.jsx

1. **Contenedor de Tabla**: Asegurar que el `div` que envuelve la `<table>` tenga `overflow-x-auto` y `-webkit-overflow-scrolling: touch`.
2. **Ancho Mínimo**: Establecer un `min-w-[800px]` (o basado en columnas) para la tabla interna, permitiendo que el usuario haga scroll horizontal para ver las acciones y columnas finales.
3. **Sticky Columns (Opcional)**: Evaluar si la columna de "Acciones" debe ser sticky a la derecha.

## Criterios de Aceptación

- El usuario puede cambiar de tabla en un iPhone/Android sin scroll infinito vertical.
- La tabla no deforma el layout general del sitio.
- Los inputs de edición en las celdas mantienen un tamaño táctil mínimo.

---

## Implementación Completada

- **Fecha**: 21 de marzo de 2026
- **Resumen**: Layout `flex-col` / `md:flex-row` en `DataView.jsx`; selector `<select>` visible solo por debajo de `md`; sidebar de botones visible desde `md`; área principal con altura calculada en viewport móvil; contenedor de tabla con scroll horizontal táctil y `min-w` en tabla/columnas; cabecera de tabla compacta en móvil; celdas e inputs con altura táctil mínima en breakpoints pequeños.
- **Nota**: La columna «Acciones» sticky a la derecha quedó como mejora opcional no implementada (scroll horizontal + `min-w-[800px]` cubre el caso de uso principal).
