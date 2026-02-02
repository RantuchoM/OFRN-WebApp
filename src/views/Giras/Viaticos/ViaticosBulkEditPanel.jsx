import React, { useState, useMemo } from "react";
import {
  IconSave,
  IconLoader,
  IconX,
  IconCloudUpload,
  IconFileText,
  IconArrowLeft,
  IconChevronRight,
  IconChevronDown,
  IconUsers,
  IconBriefcase,
  IconBus,
  IconCreditCard,
  IconCheck,
  IconMail,
  IconAlertTriangle,
  IconEdit,
} from "../../../components/ui/Icons";

// --- COMPONENTE AUXILIAR ACCORDION ---
const AccordionSection = ({
  title,
  icon: Icon,
  children,
  isOpen,
  onToggle,
}) => (
  <div className="border-b border-slate-100">
    <button
      onClick={onToggle}
      className={`w-full py-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
        isOpen ? "bg-slate-50/50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className={isOpen ? "text-indigo-600" : "text-slate-400"}
        />
        <span
          className={`text-xs font-bold uppercase tracking-wider ${isOpen ? "text-indigo-800" : "text-slate-600"}`}
        >
          {title}
        </span>
      </div>
      {isOpen ? (
        <IconChevronDown size={14} className="text-indigo-400" />
      ) : (
        <IconChevronRight size={14} className="text-slate-300" />
      )}
    </button>
    {isOpen && (
      <div className="p-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
        {children}
      </div>
    )}
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function ViaticosBulkEditPanel({
  selectionSize,
  onClose,
  values,
  setValues,
  onApply,
  loading,
  onExport,
  onSendEmails,
  isExporting,
  exportStatus,
}) {
  // ESTADOS DE VISTA: 'home' | 'edit' | 'export'
  const [currentView, setCurrentView] = useState("home");

  // Estado de los acordeones
  const [openSections, setOpenSections] = useState({
    datos: true,
    transporte: false,
    gastos: false,
    rendiciones: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Estado de opciones de exportación
  const [exportOptions, setExportOptions] = useState({
    viatico: true,
    destaque: false,
    rendicion: false,
    docComun: false,
    docReducida: false,
    unifyFiles: false,
  });

  // --- DETECCIÓN DE CAMBIOS ---
  const hasChanges = useMemo(() => {
    return Object.values(values).some((val) => {
      if (typeof val === "boolean") return val === true;
      if (typeof val === "string") return val.trim() !== "";
      return false;
    });
  }, [values]);

  // --- NAVEGACIÓN SEGURA ---

  // Intentar volver al Home o Cerrar
  const handleSafeNavigation = (targetView) => {
    // Solo verificamos cambios si estamos en modo edición
    if (currentView === "edit" && hasChanges) {
      const confirmDiscard = window.confirm(
        "Tienes cambios pendientes en el formulario.\n¿Deseas descartarlos?",
      );
      if (!confirmDiscard) return;
    }

    if (targetView === "close") {
      onClose();
    } else {
      setCurrentView(targetView);
    }
  };

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmExport = () => onExport(exportOptions);

  const isAnyOptionSelected =
    exportOptions.viatico ||
    exportOptions.destaque ||
    exportOptions.rendicion ||
    exportOptions.docComun ||
    exportOptions.docReducida;

  // Título dinámico del header
  const getHeaderTitle = () => {
    if (currentView === "edit") return "Edición Masiva";
    if (currentView === "export") return "Centro de Salida";
    return "Gestión de Selección";
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-[60]">
      {/* --- HEADER --- */}
      <div className="p-4 border-b flex justify-between items-center bg-indigo-50 shrink-0">
        <div>
          <h3 className="font-bold text-indigo-800 transition-all">
            {getHeaderTitle()}
          </h3>
          <p className="text-xs text-indigo-600 flex items-center gap-1">
            <IconUsers size={12} /> {selectionSize} seleccionados
          </p>
        </div>
        <button
          onClick={() => handleSafeNavigation("close")}
          className="p-1.5 hover:bg-white rounded-full text-indigo-400 hover:text-rose-500 transition-colors"
          title="Cerrar panel"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* --- BODY --- */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {/* ========================================================
            VISTA 0: HOME (MENÚ PRINCIPAL)
            ======================================================== */}
        {currentView === "home" && (
          <div className="p-6 space-y-4 flex flex-col justify-center h-full">
            <p className="text-xs text-slate-500 text-center mb-2">
              ¿Qué deseas hacer con los {selectionSize} registros seleccionados?
            </p>

            <button
              onClick={() => setCurrentView("edit")}
              className="group relative p-5 bg-white border border-indigo-100 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex items-start gap-4"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <IconEdit size={24} />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 group-hover:text-indigo-700">
                  Editar Datos
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Modificar cargos, transporte, montos de gastos y rendiciones
                  masivamente.
                </p>
              </div>
            </button>

            <button
              onClick={() => setCurrentView("export")}
              className="group relative p-5 bg-white border border-green-100 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all text-left flex items-start gap-4"
            >
              <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                <IconCloudUpload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-green-900 group-hover:text-green-700">
                  Exportar y Comunicar
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  Generar PDFs, subir a Drive o enviar notificaciones por mail.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ========================================================
            VISTA 1: MODO EDICIÓN
            ======================================================== */}
        {currentView === "edit" && (
          <div className="flex flex-col h-full bg-white">
            {/* Sub-Header Navegación */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center">
              <button
                onClick={() => handleSafeNavigation("home")}
                className="text-[10px] font-bold text-slate-500 flex items-center gap-1 hover:text-indigo-600"
              >
                <IconArrowLeft size={10} /> VOLVER AL MENÚ
              </button>
              {hasChanges && (
                <span className="ml-auto text-[9px] text-amber-600 font-bold flex items-center gap-1">
                  <IconAlertTriangle size={10} /> Cambios sin guardar
                </span>
              )}
            </div>

            {/* Accordions */}
            <div className="flex-1 overflow-y-auto">
              <AccordionSection
                title="Datos Laborales"
                icon={IconBriefcase}
                isOpen={openSections.datos}
                onToggle={() => toggleSection("datos")}
              >
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full p-2 border rounded text-xs outline-none focus:border-indigo-400"
                    placeholder="Cargo / Función"
                    value={values.cargo || ""}
                    onChange={(e) => handleChange("cargo", e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full p-2 border rounded text-xs outline-none focus:border-indigo-400"
                    placeholder="Jornada Laboral"
                    value={values.jornada_laboral || ""}
                    onChange={(e) =>
                      handleChange("jornada_laboral", e.target.value)
                    }
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                title="Transporte"
                icon={IconBus}
                isOpen={openSections.transporte}
                onToggle={() => toggleSection("transporte")}
              >
                <div className="space-y-3 bg-blue-50/50 p-3 rounded border border-blue-100">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600"
                        checked={values.check_aereo || false}
                        onChange={(e) =>
                          handleChange("check_aereo", e.target.checked)
                        }
                      />{" "}
                      Aéreo
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600"
                        checked={values.check_terrestre || false}
                        onChange={(e) =>
                          handleChange("check_terrestre", e.target.checked)
                        }
                      />{" "}
                      Terrestre
                    </label>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-blue-100">
                    {/* Inputs de patentes y otros... (Resumido para brevedad, mantener tu código original aquí) */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={values.check_patente_oficial || false}
                        onChange={(e) =>
                          handleChange(
                            "check_patente_oficial",
                            e.target.checked,
                          )
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 p-1.5 border rounded text-[10px]"
                        placeholder="Patente Oficial"
                        value={values.patente_oficial || ""}
                        onChange={(e) =>
                          handleChange("patente_oficial", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={values.check_patente_particular || false}
                        onChange={(e) =>
                          handleChange(
                            "check_patente_particular",
                            e.target.checked,
                          )
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 p-1.5 border rounded text-[10px]"
                        placeholder="Patente Particular"
                        value={values.patente_particular || ""}
                        onChange={(e) =>
                          handleChange("patente_particular", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={values.check_otros || false}
                        onChange={(e) =>
                          handleChange("check_otros", e.target.checked)
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 p-1.5 border rounded text-[10px]"
                        placeholder="Otro (Detalle)"
                        value={values.transporte_otros || ""}
                        onChange={(e) =>
                          handleChange("transporte_otros", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="Gastos Adicionales"
                icon={IconCreditCard}
                isOpen={openSections.gastos}
                onToggle={() => toggleSection("gastos")}
              >
                <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                  {[
                    { label: "Movilidad", key: "gastos_movilidad" },
                    { label: "Combustible", key: "gasto_combustible" },
                    { label: "Alojamiento", key: "gasto_alojamiento" },
                    { label: "Pasajes", key: "gasto_pasajes" },
                    { label: "Capacitación", key: "gastos_capacit" },
                    { label: "Mov. Otros", key: "gastos_movil_otros" },
                  ].map((item) => (
                    <div key={item.key} className="space-y-1">
                      <label className="text-[9px] text-slate-400 font-bold uppercase">
                        {item.label}
                      </label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded text-xs text-right"
                        value={values[item.key] || ""}
                        onChange={(e) => handleChange(item.key, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase">
                      Otros Gastos
                    </label>
                    <input
                      type="number"
                      className="w-full p-1.5 border rounded text-xs text-right"
                      value={values.gasto_otros || ""}
                      onChange={(e) =>
                        handleChange("gasto_otros", e.target.value)
                      }
                    />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection
                title="Rendiciones"
                icon={IconCheck}
                isOpen={openSections.rendiciones}
                onToggle={() => toggleSection("rendiciones")}
              >
                <div className="space-y-3 bg-green-50/50 p-2 rounded border border-green-100">
                  {/* Lista de rendiciones igual que antes */}
                  {[
                    { id: "rendicion_viaticos", label: "R. Viáticos" },
                    {
                      id: "rendicion_gasto_alojamiento",
                      label: "R. Alojamiento",
                    },
                    { id: "rendicion_gasto_pasajes", label: "R. Pasajes" },
                    {
                      id: "rendicion_gasto_combustible",
                      label: "R. Combustible",
                    },
                  ].map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <label className="text-[10px] text-green-800 font-bold uppercase flex-1">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        className="w-24 p-1.5 border border-green-200 rounded text-xs text-right bg-white"
                        value={values[field.id] || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </AccordionSection>
            </div>

            {/* Footer de Edición */}
            <div className="p-4 border-t bg-slate-50 mt-auto shrink-0">
              <button
                onClick={onApply}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex justify-center items-center gap-2 disabled:opacity-50 transition-all hover:translate-y-[-1px]"
              >
                {loading ? (
                  <IconLoader className="animate-spin" size={16} />
                ) : (
                  <IconSave size={16} />
                )}{" "}
                Aplicar Cambios
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            VISTA 2: MODO EXPORTACIÓN / SALIDA
            ======================================================== */}
        {currentView === "export" && (
          <div className="p-4 space-y-4 h-full flex flex-col bg-white">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <button
                onClick={() => setCurrentView("home")}
                className="text-[10px] text-slate-500 font-bold flex items-center gap-1 hover:text-indigo-600"
              >
                <IconArrowLeft size={10} /> VOLVER AL MENÚ
              </button>
            </div>

            {/* SECCIÓN NOTIFICACIONES */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
              <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1">
                <IconMail size={12} /> Comunicación
              </h5>
              <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                Envía liquidación por mail a los {selectionSize} seleccionados.
              </p>
              <button
                onClick={() => onSendEmails(false)}
                disabled={loading || isExporting}
                className="w-full py-2.5 bg-slate-800 text-white text-xs font-bold rounded-lg shadow hover:bg-slate-700 flex justify-center items-center gap-2 disabled:opacity-50 transition-all"
              >
                <IconMail size={14} /> Enviar Notificación
              </button>
            </div>

            {/* SECCIÓN EXPORTACIÓN */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 shadow-sm flex-1 flex flex-col">
              <h5 className="text-[10px] font-black text-green-700 uppercase mb-2 flex items-center gap-1">
                <IconCloudUpload size={12} /> Exportar PDFs
              </h5>

              <div className="space-y-1 mb-4 bg-white p-2 rounded border border-green-100 flex-1 overflow-y-auto max-h-[200px]">
                {/* Checkboxes de exportación */}
                <label className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.viatico}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        viatico: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600"
                  />{" "}
                  1. Viático
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.destaque}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        destaque: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600"
                  />{" "}
                  2. Destaque
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.rendicion}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        rendicion: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600"
                  />{" "}
                  3. Rendición
                </label>
                <div className="h-px bg-slate-100 my-1"></div>
                <label className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.docComun}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        docComun: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600"
                  />{" "}
                  Doc. Común
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.docReducida}
                    onChange={(e) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        docReducida: e.target.checked,
                      }))
                    }
                    className="rounded text-green-600"
                  />{" "}
                  Doc. Reducida
                </label>
              </div>

              <div
                onClick={() =>
                  setExportOptions((prev) => ({
                    ...prev,
                    unifyFiles: !prev.unifyFiles,
                  }))
                }
                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-green-100 p-2 rounded border border-green-200 mb-3 bg-white"
              >
                <div
                  className={`w-8 h-4 flex items-center rounded-full p-0.5 duration-300 ${exportOptions.unifyFiles ? "bg-green-500" : "bg-slate-300"}`}
                >
                  <div
                    className={`bg-white w-3 h-3 rounded-full shadow transform duration-300 ${exportOptions.unifyFiles ? "translate-x-4" : "translate-x-0"}`}
                  ></div>
                </div>
                <span className="font-bold text-[10px] text-green-800">
                  {exportOptions.unifyFiles
                    ? "1 PDF UNIFICADO"
                    : "PDFs INDIVIDUALES"}
                </span>
              </div>

              <button
                onClick={handleConfirmExport}
                disabled={loading || isExporting || !isAnyOptionSelected}
                className={`w-full py-3 text-xs font-bold rounded-lg shadow flex justify-center items-center gap-2 mt-auto ${isExporting ? "bg-slate-100 text-slate-400" : "bg-green-600 text-white hover:bg-green-700"}`}
              >
                {isExporting ? (
                  <IconLoader className="animate-spin" size={14} />
                ) : (
                  <IconCloudUpload size={14} />
                )}{" "}
                Confirmar Exportación
              </button>

              {isExporting && (
                <div className="mt-2 text-[10px] text-center text-amber-600 font-bold animate-pulse">
                  {exportStatus || "Procesando..."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
