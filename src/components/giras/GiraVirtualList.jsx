import React, { useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const DEFAULT_ROW_HEIGHT = 300;
const ROW_GAP_PX = 16;

/**
 * Lista virtualizada de GiraCard.
 */
export default function GiraVirtualList({
  items,
  scrollElementRef,
  renderItem,
  estimateRowHeight = DEFAULT_ROW_HEIGHT,
  overscan = 4,
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => estimateRowHeight + ROW_GAP_PX,
    overscan,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [items, virtualizer]);

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
            key={item.key ?? item.id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full pb-4"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}
