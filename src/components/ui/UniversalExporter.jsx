import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconDownload, IconCheck } from "./Icons";
import { generateExcel, generatePDF } from "../../utils/universalExportLogic";

/**
 * Configurador de exportación universal (Excel / PDF) con selector de columnas.
 *
 * Props:
 * - data: array de objetos ya filtrados/ordenados.
 * - columns: [{ header, key, width, type, defaultSelected? }]
 * - fileName: nombre base del archivo (sin extensión).
 */
export default function UniversalExporter({
  data,
  columns,
  fileName,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState("excel"); // 'excel' | 'pdf'
  const [pdfOrientation, setPdfOrientation] = useState("p"); // 'p' | 'l'
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const hasData = Array.isArray(data) && data.length > 0;
  const safeColumns = Array.isArray(columns) ? columns : [];

  // Inicializar selección de columnas al abrir el modal
  useEffect(() => {
    if (!isOpen) return;
    const initial = new Set(
      safeColumns
        .filter((c) => c.defaultSelected !== false)
        .map((c) => c.key)
    );
    // Si no hay ninguna marcada explícitamente, seleccionar todas
    if (initial.size === 0) {
      safeColumns.forEach((c) => initial.add(c.key));
    }
    setSelectedKeys(initial);
  }, [isOpen, safeColumns]);

  const toggleColumn = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = safeColumns.length > 0 && selectedKeys.size === safeColumns.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(safeColumns.map((c) => c.key)));
    }
  };

  const getSelectedColumns = () =>
    safeColumns.filter((c) => selectedKeys.has(c.key));

  const handleConfirm = async () => {
    if (!hasData) return;
    const cols = getSelectedColumns();
    if (cols.length === 0) return;

    setIsExporting(true);
    try {
      if (format === "excel") {
        await generateExcel(data, cols, fileName);
      } else {
        generatePDF(data, cols, fileName, pdfOrientation);
      }
      setIsOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => hasData && setIsOpen(true)}
        disabled={!hasData || isExporting}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
        title={hasData ? "Exportar datos" : "Sin datos para exportar"}
      >
        <span className="sr-only">Exportar</span>
        <IconDownload size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Configurar Exportación
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Elegí formato, orientación y columnas a incluir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !isExporting && setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto">
                {/* Formato */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                    Formato
                  </p>
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setFormat("excel")}
                      className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                        format === "excel"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("pdf")}
                      className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                        format === "pdf"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      PDF
                    </button>
                  </div>
                </div>

                {/* Orientación solo para PDF */}
                {format === "pdf" && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                      Orientación (PDF)
                    </p>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPdfOrientation("p")}
                        className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                          pdfOrientation === "p"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        Vertical
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfOrientation("l")}
                        className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                          pdfOrientation === "l"
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        Horizontal
                      </button>
                    </div>
                  </div>
                )}

                {/* Columnas */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">
                      Columnas
                    </p>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {allSelected ? "Desmarcar todas" : "Marcar todas"}
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-slate-50/60">
                    {safeColumns.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-slate-400">
                        No hay columnas configuradas.
                      </div>
                    ) : (
                      safeColumns.map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedKeys.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                          />
                          <span className="truncate">
                            {col.header || col.key}
                          </span>
                          {col.defaultSelected === false && (
                            <span className="ml-auto text-[9px] text-slate-400 uppercase">
                              opcional
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
                <span className="text-[11px] text-slate-500">
                  {selectedKeys.size} columna(s) seleccionada(s)
                </span>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasData || selectedKeys.size === 0 || isExporting}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {isExporting && (
                    <IconCheck size={12} className="animate-pulse text-emerald-300" />
                  )}
                  Confirmar exportación
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}