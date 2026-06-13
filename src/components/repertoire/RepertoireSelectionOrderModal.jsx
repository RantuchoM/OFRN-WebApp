import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconX, IconGripVertical, IconCheck, IconArrowUp, IconArrowDown } from "../ui/Icons";

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, "")
    .trim();

function SortableRow({ work, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: work.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
      }}
      className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm"
    >
      <button
        type="button"
        className="text-slate-400 hover:text-indigo-600 cursor-grab active:cursor-grabbing p-1"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar"
      >
        <IconGripVertical size={16} />
      </button>
      <span className="text-xs font-bold text-indigo-600 w-6 shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-700 truncate">
          {work.compositor_full || "Sin compositor"}
        </div>
        <div className="text-[11px] text-slate-600 truncate">{stripHtml(work.titulo)}</div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(work.id)}
        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
        title="Quitar de la selección"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

function ManualOrderRow({ work, index, total, onMove, onRemove }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
      <span className="text-xs font-bold text-indigo-600 w-6 shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-700 truncate">
          {work.compositor_full || "Sin compositor"}
        </div>
        <div className="text-[11px] text-slate-600 truncate">{stripHtml(work.titulo)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          className="p-1 rounded border border-slate-200 text-indigo-600 disabled:opacity-30"
          aria-label="Subir obra"
          title="Subir"
        >
          <IconArrowUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index >= total - 1}
          className="p-1 rounded border border-slate-200 text-indigo-600 disabled:opacity-30"
          aria-label="Bajar obra"
          title="Bajar"
        >
          <IconArrowDown size={14} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(work.id)}
          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="Quitar de la selección"
          aria-label="Quitar de la selección"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

export default function RepertoireSelectionOrderModal({
  worksById,
  orderedIds,
  onSave,
  onClose,
}) {
  const [draftIds, setDraftIds] = useState(() => [...orderedIds]);
  const [isMobileOrder, setIsMobileOrder] = useState(false);

  const draftWorks = useMemo(
    () =>
      draftIds
        .map((id) => worksById.get(id))
        .filter(Boolean),
    [draftIds, worksById],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileOrder(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftIds((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleRemove = (id) => {
    setDraftIds((prev) => prev.filter((x) => x !== id));
  };

  const handleManualMove = (fromIndex, toIndex) => {
    setDraftIds((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      return arrayMove(prev, fromIndex, toIndex);
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Orden de la selección</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMobileOrder ? "Usá las flechas para reordenar." : "Arrastrá para reordenar."}{" "}
              {draftWorks.length} obra{draftWorks.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-2">
          {draftWorks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic text-sm">
              No hay obras en la selección.
            </div>
          ) : isMobileOrder ? (
            <div className="space-y-2">
              {draftWorks.map((work, index) => (
                <ManualOrderRow
                  key={work.id}
                  work={work}
                  index={index}
                  total={draftWorks.length}
                  onMove={handleManualMove}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draftIds}
                strategy={verticalListSortingStrategy}
              >
                {draftWorks.map((work, index) => (
                  <SortableRow
                    key={work.id}
                    work={work}
                    index={index}
                    onRemove={handleRemove}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draftIds)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm flex items-center gap-2"
          >
            <IconCheck size={14} /> Guardar orden
          </button>
        </div>
      </div>
    </div>
  );
}
