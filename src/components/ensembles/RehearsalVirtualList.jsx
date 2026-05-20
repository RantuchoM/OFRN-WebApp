import React, { useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const DEFAULT_ROW_HEIGHT = 116;
const ROW_GAP_PX = 8;

/**
 * Lista virtualizada de ensayos: solo monta filas cercanas al viewport.
 */
export default function RehearsalVirtualList({
  items,
  scrollElementRef,
  renderItem,
  estimateRowHeight = DEFAULT_ROW_HEIGHT,
  overscan = 6,
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
            key={item.id ?? virtualRow.key}
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
