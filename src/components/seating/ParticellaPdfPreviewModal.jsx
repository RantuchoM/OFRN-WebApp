import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconExternalLink,
  IconEye,
  IconLoader,
  IconPlus,
} from "../ui/Icons";
import {
  addPagesToSpec,
  isExplicitPageSelected,
  parsePageRange,
  previewClickSpec,
} from "../../utils/pdfPageRange";
import ParticellaPdfScroll from "./ParticellaPdfScroll";

function rangePages(a, b) {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const pages = [];
  for (let n = start; n <= end; n += 1) pages.push(n);
  return pages;
}

export default function ParticellaPdfPreviewModal({
  preview,
  pageSpec,
  onPageSpecChange,
  onClose,
  onOpenInTab,
}) {
  const [viewPage, setViewPage] = useState(0);
  const [desde, setDesde] = useState(null);
  const [hasta, setHasta] = useState(null);
  const anchorRef = useRef(null);
  const saveRef = useRef(() => {});
  const sourceUrl = preview?.sourceUrl || "";

  useEffect(() => {
    setViewPage(0);
    setDesde(null);
    setHasta(null);
    anchorRef.current = null;
  }, [sourceUrl]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      saveRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [preview]);

  if (!preview) return null;

  const pageCount = preview.pageCount || 0;
  const parsed = parsePageRange(pageSpec || "", pageCount || null);
  const isPdf = !preview.mime || preview.mime === "application/pdf";
  const currentPage = isPdf ? viewPage : pageCount ? 1 : 0;

  const applySpec = (next) => {
    anchorRef.current = null;
    onPageSpecChange?.(next);
  };

  const markDesde = () => {
    if (!currentPage) return;
    if (hasta != null) {
      applySpec(
        addPagesToSpec(
          pageSpec,
          rangePages(currentPage, hasta),
          pageCount,
        ),
      );
      setDesde(null);
      setHasta(null);
      return;
    }
    setDesde(currentPage);
  };

  const markHasta = () => {
    if (!currentPage) return;
    if (desde != null) {
      applySpec(
        addPagesToSpec(
          pageSpec,
          rangePages(desde, currentPage),
          pageCount,
        ),
      );
      setDesde(null);
      setHasta(null);
      return;
    }
    setHasta(currentPage);
  };

  const sumarPagina = () => {
    if (!currentPage) return;
    onPageSpecChange?.(addPagesToSpec(pageSpec, [currentPage], pageCount));
  };

  const handleSave = () => {
    const pending = desde ?? hasta;
    if (pending != null) {
      onPageSpecChange?.(addPagesToSpec(pageSpec, [pending], pageCount));
    }
    onClose();
  };
  saveRef.current = handleSave;

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="particella-preview-title"
      onClick={(e) => {
        e.stopPropagation();
        handleSave();
      }}
    >
      <div
        className="flex h-[min(92vh,100%)] w-full min-w-0 max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <h2
              id="particella-preview-title"
              className="flex items-center gap-2 text-sm font-bold text-slate-800"
            >
              <IconEye size={16} className="shrink-0 text-indigo-600" />
              <span className="truncate">{preview.title || "Particella"}</span>
            </h2>
            {preview.subtitle ? (
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {preview.subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              disabled={!preview.blobUrl}
              onClick={onOpenInTab}
            >
              <IconExternalLink size={12} />
              Abrir
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-indigo-700"
              title="Deja estas páginas en la fila y cierra la vista"
            >
              Guardar
            </button>
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[10rem] flex-1">
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Páginas a imprimir
                {pageCount > 0 ? ` · ${pageCount} en el PDF` : ""}
              </span>
              <input
                type="text"
                value={pageSpec || ""}
                disabled={!onPageSpecChange || preview.loading}
                placeholder="Todas"
                title="Vacío imprime todas. Ej: 1-3, 5"
                aria-label="Páginas a imprimir"
                onChange={(e) => {
                  anchorRef.current = null;
                  setDesde(null);
                  setHasta(null);
                  onPageSpecChange?.(e.target.value);
                }}
                className={`w-full rounded border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                  parsed.ok
                    ? "border-slate-300 focus:border-indigo-400 focus:ring-indigo-400"
                    : "border-red-300 focus:border-red-400 focus:ring-red-400"
                }`}
              />
            </label>
            <button
              type="button"
              disabled={!onPageSpecChange || !pageSpec}
              onClick={() => {
                anchorRef.current = null;
                setDesde(null);
                setHasta(null);
                onPageSpecChange?.("");
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Todas
            </button>
          </div>
          {!parsed.ok ? (
            <p className="text-[11px] text-red-600">{parsed.error}</p>
          ) : parsed.dropped?.length ? (
            <p className="text-[11px] text-amber-700">
              Este PDF tiene {pageCount} páginas. Se omiten:{" "}
              {parsed.dropped.join(", ")}.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              {desde != null
                ? `Inicio en la p. ${desde}. Andá a la última y tocá Hasta aquí.`
                : hasta != null
                  ? `Fin en la p. ${hasta}. Volvé a la primera y tocá Desde aquí.`
                  : !String(pageSpec || "").trim()
                    ? "Sin marcas se imprime todo. Desde aquí y Hasta aquí arman un rango; Sumar agrega solo la página que estás viendo. El borde celeste es esa página."
                    : `Se imprimen ${parsed.pages?.length || pageCount} página${
                        (parsed.pages?.length || pageCount) === 1 ? "" : "s"
                      }. Podés sumar otro rango.`}
            </p>
          )}
          {pageCount > 0 && (
            <div className="max-h-28 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: pageCount }, (_, i) => {
                  const n = i + 1;
                  const on = isExplicitPageSelected(pageSpec, n, pageCount);
                  const viewing = currentPage === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={!onPageSpecChange}
                      onMouseDown={(e) => {
                        if (e.shiftKey) e.preventDefault();
                      }}
                      onClick={(e) => {
                        const next = previewClickSpec({
                          spec: pageSpec,
                          page: n,
                          pageCount,
                          shift: e.shiftKey,
                          anchor: anchorRef.current,
                        });
                        anchorRef.current = next.anchor;
                        onPageSpecChange?.(next.spec);
                      }}
                      className={`h-6 min-w-6 rounded px-1 text-[11px] font-semibold tabular-nums ${
                        on
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      } ${viewing ? "ring-2 ring-sky-500 ring-offset-1" : ""} ${
                        desde === n ? "outline outline-2 outline-amber-500" : ""
                      } ${hasta === n ? "outline outline-2 outline-emerald-600" : ""}`}
                      aria-pressed={on}
                      aria-label={`Página ${n}${viewing ? ", viendo ahora" : ""}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <span className="text-xs font-bold text-slate-700">
            {currentPage
              ? `Viendo la página ${currentPage}${pageCount ? ` de ${pageCount}` : ""}`
              : "Buscando la página…"}
          </span>
          <button
            type="button"
            disabled={!currentPage || !onPageSpecChange}
            onClick={markDesde}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
              hasta != null && desde == null
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:opacity-40`}
            title="Marca el inicio del rango en la página que estás viendo. Si ya hay un fin, completa el rango."
          >
            Desde aquí
          </button>
          <button
            type="button"
            disabled={!currentPage || !onPageSpecChange}
            onClick={markHasta}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
              desde != null && hasta == null
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:opacity-40`}
            title="Marca el fin del rango en la página que estás viendo. Si ya hay un inicio, completa el rango."
          >
            Hasta aquí
          </button>
          <button
            type="button"
            disabled={!currentPage || !onPageSpecChange}
            onClick={sumarPagina}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            title="Agrega solo la página que estás viendo"
          >
            <IconPlus size={12} />
            Sumar
          </button>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100">
          {preview.loading && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
              <IconLoader className="animate-spin" size={18} />
              Cargando PDF…
            </div>
          )}
          {!preview.loading && preview.error && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-600">
              {preview.error}
            </div>
          )}
          {!preview.loading && !preview.error && preview.blobUrl && isPdf && (
            <ParticellaPdfScroll
              url={preview.blobUrl}
              onCurrentPage={setViewPage}
            />
          )}
          {!preview.loading && !preview.error && preview.blobUrl && !isPdf && (
            <div className="flex h-full items-center justify-center p-4">
              <img
                src={preview.blobUrl}
                alt={preview.title || "Archivo"}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
