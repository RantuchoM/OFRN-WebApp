# Especificación Técnica: Coordinador General (Rol de Gestión de Personal)

## Objetivo
Implementar el rol `coord_general` como una entidad de coordinación con alcance sobre todos los ensambles, pero restringida a las acciones propias de un coordinador (asistencia, visualización técnica, gestión de ensayos parciales).

## Lógica de Permisos
- **Identidad**: El usuario mantiene su `rol_sistema` como `coord_general`.
- **Alcance**: 
  - No hereda `isEditor`. No puede editar eventos sinfónicos o generales.
  - Hereda la lógica de coordinación de ensambles de forma global.
  - En `UnifiedAgenda.jsx`, el `Set` `coordinatedEnsembles` se puebla con todos los IDs de la tabla `ensambles` cuando el usuario tiene `coord_general`.
- **Restricciones**: 
  - No puede modificar la configuración de una Gira.
  - Solo puede editar eventos donde el tipo sea "Ensayos de Ensamble" (ID 13) o similares, gracias a la lógica de `canUserEditEvent` ya existente que valida contra el `Set` de ensambles.

## UI móvil de Coordinación
- **Estado:** Implementado (2026-06-13).
- El header principal de `EnsembleCoordinatorView.jsx` mantiene título, ayuda, filtros/herramientas y botón "Nuevo" en una sola fila móvil, reduciendo gaps/paddings y acotando badges con scroll horizontal.
- La barra de pestañas y acciones superiores queda en una sola fila móvil; las pestañas usan scroll horizontal y etiquetas compactas.
- Las cards móviles de ensayo reducen padding, márgenes y tamaños secundarios para ganar densidad vertical.
- El horario de inicio/fin de cada card usa `whitespace-nowrap` para permanecer en una misma línea.
- Las acciones de la card se apilan verticalmente: editar arriba y eliminar abajo. El botón de eliminación se muestra en rojo.
- El tooltip de feriado se alinea hacia la derecha del badge (`left-0`) y usa `z-[110]` para no quedar cortado en pantallas móviles.
- La fila de controles de lista móvil queda en una sola línea con scroll horizontal: checkbox grande sin etiqueta textual, filtro Programa, fechas y export PDF.
- En el formulario de ensayo (`IndependentRehearsalForm.jsx`), la antigua "Nota Pública" pasa a llamarse **Título** y se ubica arriba, antes de Convocatoria.
- En móvil, las secciones **Convocatoria**, **Asistencia Particular** y **Repertorio / Programación** son contraíbles y arrancan cerradas; en desktop permanecen visibles.
- Convocatoria y Repertorio muestran chips/resumen de selección aun cuando la sección móvil está contraída.

