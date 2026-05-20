import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const DEFAULT_ROW_HEIGHT = 116;
const ROW_GAP_PX = 8;

/**
 * Lista virtualizada de ensayos: solo monta filas cercanas al viewport.
 */
export default function RehearsalVirtualList({
  items,
  scrollElement = null,
  scrollElementRef,
  renderItem,
  estimateRowHeight = DEFAULT_ROW_HEIGHT,
  overscan = 6,
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () =>
      scrollElement ?? scrollElementRef?.current ?? null,
    estimateSize: () => estimateRowHeight + ROW_GAP_PX,
    getItemKey: (index) => items[index]?.id ?? index,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  if (items.length === 0) return null;

  return (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualRows.map((virtualRow) => {
        const item = items[virtualRow.index];
        if (!item) return null;
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full pb-2"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}
