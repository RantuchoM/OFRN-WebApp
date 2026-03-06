# Espec: Unificación de Accesos Rápidos en GiraCard (Mobile)

## Objetivo
Permitir que los usuarios con rol de Editor tengan acceso a los botones de acceso rápido (Agenda, Música, Drive, Comidas, Hotel) en la vista móvil de las GiraCards, sin perder el acceso al menú de acciones administrativas y comentarios.

## Requerimientos de UI/UX
1. **Unificación**: La barra lateral derecha en móvil (QuickAccessSidebar) debe mostrarse tanto para consulta personal como para editores.
2. **Jerarquía**: 
   - En la parte superior de la barra: `GiraActionMenu` (los tres puntos).
   - En el centro: Accesos directos (`IconCalendar`, `IconMusic`, `IconDrive`, `IconUtensils`, `IconHotel`).
   - En la parte inferior: `CommentButton`.
3. **Consistencia**: El margen derecho del contenido de la tarjeta (`pr-11`) debe aplicarse siempre que la barra esté presente.

## Cambios Técnicos
- Modificar la constante `showQuickAccessSidebar` para incluir a editores (y excluir solo rol difusión).
- Reposicionar el `GiraActionMenu` y el `CommentButton` dentro del contenedor de la barra lateral en el bloque de "VISTA MÓVIL".
- Eliminar los bloques condicionales que renderizaban el menú y los comentarios por fuera de la barra lateral en móvil.

## Estado de implementación
**Implementado.** La barra lateral móvil es universal para gestión (editores) y consulta (vista personal). Solo se oculta para el rol de difusión, que conserva únicamente el menú de acciones en la esquina superior derecha. Archivo afectado: `src/views/Giras/GiraCard.jsx`.
