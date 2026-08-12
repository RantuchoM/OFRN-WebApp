import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconChevronDown,
  IconDownload,
  IconFileText,
  IconList,
  IconFileExcel,
  IconLoader,
} from "../../components/ui/Icons";
import CnrtExportModal from "../Giras/CnrtExportModal";
import {
  sequenceEventsForExport,
  exportFimbaCnrt,
  exportFimbaParadas,
  exportFimbaHojaRuta,
} from "../../utils/fimbaReports";
import { exportFimbaTransporteVehiculoExcel } from "../../utils/fimbaExport";
import { labelGiraTransporte } from "../../services/fimbaService";

const MENU_MIN_WIDTH = 220;
const MENU_ESTIMATED_HEIGHT = 280;

/**
 * Menú de reportes por vehículo FIMBA (CNRT, paradas, hoja de ruta, Excel abordaje).
 * Reutiliza CnrtExportModal OFRN para rango + formato PDF/Excel.
 */
export default function FimbaTransportReportsMenu({
  vehiculo,
  sequence,
  edicionNombre = "",
  ofrnPassengerById = null,
  participantesByPropuesta = null,
  disabled = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [modal, setModal] = useState(null); // cnrt | paradas | roadmap
  const [busy, setBusy] = useState(false);
  const [gapNote, setGapNote] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const events = useMemo(
    () => sequenceEventsForExport(sequence),
    [sequence],
  );

  const transportForModal = useMemo(
    () => ({
      id: vehiculo?.id,
      detalle: labelGiraTransporte(vehiculo),
      transportes: vehiculo?.transportes || null,
    }),
    [vehiculo],
  );

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setMenuStyle(null);
      return;
    }
    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, MENU_MIN_WIDTH);
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropUp =
        spaceBelow < MENU_ESTIMATED_HEIGHT && rect.top > MENU_ESTIMATED_HEIGHT;
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      setMenuStyle({
        position: "fixed",
        left,
        width,
        zIndex: 100,
        ...(dropUp
          ? { top: "auto", bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4, bottom: "auto" }),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPtr = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPtr);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPtr);
    };
  }, [menuOpen]);

  const runExcelAbordaje = async () => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await exportFimbaTransporteVehiculoExcel({
        edicionNombre,
        vehiculo,
        sequence,
        passengerById: ofrnPassengerById,
      });
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error al exportar Excel");
    } finally {
      setBusy(false);
    }
  };

  const handleModalExport = async (startId, endId, exportFormat = "pdf") => {
    setBusy(true);
    try {
      if (modal === "cnrt") {
        const res = await exportFimbaCnrt({
          vehiculo,
          sequence,
          startId,
          endId,
          exportFormat,
          ofrnPassengerById,
          participantesByPropuesta,
        });
        if (res?.gaps?.length) setGapNote(res.gaps.join("\n"));
      } else if (modal === "paradas") {
        await exportFimbaParadas({
          vehiculo,
          sequence,
          startId,
          endId,
          exportFormat,
        });
      } else if (modal === "roadmap") {
        const res = await exportFimbaHojaRuta({
          vehiculo,
          sequence,
          startId,
          endId,
          exportFormat,
          ofrnPassengerById,
          participantesByPropuesta,
        });
        if (res?.gaps?.length) setGapNote(res.gaps.join("\n"));
      }
      setModal(null);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error al exportar");
    } finally {
      setBusy(false);
    }
  };

  const items = [
    {
      key: "excel",
      label: "Abordaje + secuencia (Excel)",
      icon: IconFileExcel,
      onClick: runExcelAbordaje,
    },
    {
      key: "paradas",
      label: "Cronograma de paradas",
      icon: IconList,
      onClick: () => {
        setMenuOpen(false);
        setModal("paradas");
      },
    },
    {
      key: "roadmap",
      label: "Hoja de ruta",
      icon: IconFileText,
      onClick: () => {
        setMenuOpen(false);
        setModal("roadmap");
      },
    },
    {
      key: "cnrt",
      label: "Exportar CNRT",
      icon: IconDownload,
      onClick: () => {
        setMenuOpen(false);
        setModal("cnrt");
      },
    },
  ];

  const modalTitle =
    modal === "cnrt"
      ? "Exportar CNRT"
      : modal === "paradas"
        ? "Cronograma de paradas"
        : modal === "roadmap"
          ? "Hoja de ruta"
          : "Exportar";

  return (
    <>
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          className="fimba-btn fimba-btn-ghost"
          style={{ padding: "0.25rem 0.4rem" }}
          disabled={disabled || busy || !vehiculo}
          title="Reportes de transporte (CNRT, paradas, hoja de ruta, Excel)"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {busy ? (
            <IconLoader size={15} className="animate-spin" />
          ) : (
            <>
              <IconDownload size={15} />
              <IconChevronDown size={12} />
            </>
          )}
        </button>

        {menuOpen &&
          menuStyle &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              className="rounded-xl border border-slate-200 bg-white shadow-2xl py-1 overflow-hidden"
              style={menuStyle}
              role="menu"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Reportes · {labelGiraTransporte(vehiculo)}
              </div>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={item.onClick}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Icon size={14} className="text-slate-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <p className="px-3 py-2 text-[10px] text-amber-800 bg-amber-50 border-t border-amber-100 leading-snug">
                CNRT/hoja de ruta: OFRN con DNI; FIMBA intenta nominados del
                artista (hasta plazas). Plazas sin nombre = filas sintéticas.
              </p>
            </div>,
            document.body,
          )}
      </div>

      {modal && events.length > 0 && (
        <CnrtExportModal
          transport={transportForModal}
          events={events}
          title={modalTitle}
          showAlignViaticos={false}
          onClose={() => setModal(null)}
          onExport={(sid, eid, format) =>
            handleModalExport(sid, eid, format || "pdf")
          }
        />
      )}
      {modal && events.length === 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 max-w-sm shadow-xl">
            <p className="text-sm text-slate-700 mb-3">
              Este vehículo no tiene paradas en la secuencia.
            </p>
            <button
              type="button"
              className="fimba-btn"
              onClick={() => setModal(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {gapNote &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setGapNote(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-4 border border-amber-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-bold text-amber-900 text-sm mb-2">
                Avisos de paridad CNRT / hoja de ruta
              </h4>
              <pre className="whitespace-pre-wrap text-xs text-slate-700 bg-amber-50 rounded-lg p-3 mb-3">
                {gapNote}
              </pre>
              <button
                type="button"
                className="fimba-btn"
                onClick={() => setGapNote(null)}
              >
                Entendido
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
