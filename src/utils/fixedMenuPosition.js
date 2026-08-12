/**
 * Posiciona un menú `position: fixed` (portal a document.body).
 * Si no hay espacio abajo, abre hacia arriba y limita maxHeight para que
 * las últimas opciones sigan alcanzables con scroll.
 */
export function getFixedMenuPosition(
  anchorRect,
  {
    width,
    estimatedHeight = 280,
    measuredHeight,
    gap = 4,
    padding = 8,
    align = "left",
    minHeight = 120,
  } = {},
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = Math.min(
    Math.max(width || anchorRect.width || 180, 120),
    Math.max(120, viewportWidth - padding * 2),
  );
  const height = measuredHeight || estimatedHeight;
  const spaceBelow = viewportHeight - anchorRect.bottom - gap - padding;
  const spaceAbove = anchorRect.top - gap - padding;
  const openBelow =
    spaceBelow >= Math.min(height, minHeight) || spaceBelow >= spaceAbove;
  const available = Math.max(minHeight, openBelow ? spaceBelow : spaceAbove);
  const usedHeight = Math.min(height, available);

  const top = openBelow
    ? anchorRect.bottom + gap
    : Math.max(padding, anchorRect.top - gap - usedHeight);

  let left =
    align === "right" ? anchorRect.right - menuWidth : anchorRect.left;
  left = Math.min(
    Math.max(padding, left),
    viewportWidth - menuWidth - padding,
  );

  return {
    top,
    left,
    width: menuWidth,
    maxHeight: available,
    openBelow,
  };
}
