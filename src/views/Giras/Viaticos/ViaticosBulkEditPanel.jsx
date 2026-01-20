import React, { useState } from "react";
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
  IconUser,
  IconBriefcase,
  IconBus,
  IconCreditCard,
  IconCheck,
} from "../../../components/ui/Icons";

// Componente auxiliar para las secciones colapsables
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
      className={`w-full py-3 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isOpen ? "bg-slate-50/50" : ""}`}
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

export default function ViaticosBulkEditPanel({
  selectionSize,
  onClose,
  values,
  setValues,
  onApply,
  loading,
  onExport,
  isExporting,
  exportStatus,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [openSections, setOpenSections] = useState({
    datos: true,
    transporte: false,
    gastos: false,
    rendiciones: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [exportOptions, setExportOptions] = useState({
    viatico: true,
    destaque: false,
    rendicion: false,
    docComun: false,
    docReducida: false,
    unifyFiles: false,
  });

  const handleConfirmExport = () => onExport(exportOptions);

  const isAnyOptionSelected =
    exportOptions.viatico ||
    exportOptions.destaque ||
    exportOptions.rendicion ||
    exportOptions.docComun ||
    exportOptions.docReducida;

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-50 absolute right-0 top-0 bottom-0">
      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
        <div>
          <h3 className="font-bold text-indigo-800">Edición Masiva</h3>
          <p className="text-xs text-indigo-600">
            {selectionSize} seleccionados
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white rounded-full text-indigo-400"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto">
        {/* SECCIÓN DATOS LABORALES */}
        <AccordionSection
          title="Datos Laborales"
          icon={IconBriefcase}
          isOpen={openSections.datos}
          onToggle={() => toggleSection("datos")}
        >
          <div className="space-y-2">
            <input
              type="text"
              className="w-full p-2 border rounded text-xs"
              placeholder="Cargo / Función"
              value={values.cargo || ""}
              onChange={(e) => handleChange("cargo", e.target.value)}
            />
            <input
              type="text"
              className="w-full p-2 border rounded text-xs"
              placeholder="Jornada Laboral"
              value={values.jornada_laboral || ""}
              onChange={(e) => handleChange("jornada_laboral", e.target.value)}
            />
          </div>
        </AccordionSection>

        {/* SECCIÓN TRANSPORTE */}
        <AccordionSection
          title="Transporte"
          icon={IconBus}
          isOpen={openSections.transporte}
          onToggle={() => toggleSection("transporte")}
        >
          <div className="space-y-3 bg-blue-50/50 p-2 rounded border border-blue-100">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
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
                  checked={values.check_terrestre || false}
                  onChange={(e) =>
                    handleChange("check_terrestre", e.target.checked)
                  }
                />{" "}
                Terrestre
              </label>
            </div>
            <div className="space-y-2 pt-2 border-t border-blue-100">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.check_patente_oficial || false}
                  onChange={(e) =>
                    handleChange("check_patente_oficial", e.target.checked)
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
                    handleChange("check_patente_particular", e.target.checked)
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

        {/* SECCIÓN GASTOS ADICIONALES */}
        <AccordionSection
          title="Gastos Adicionales"
          icon={IconCreditCard}
          isOpen={openSections.gastos}
          onToggle={() => toggleSection("gastos")}
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Movilidad
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gastos_movilidad || ""}
                onChange={(e) =>
                  handleChange("gastos_movilidad", e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Combustible
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gasto_combustible || ""}
                onChange={(e) =>
                  handleChange("gasto_combustible", e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Alojamiento
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gasto_alojamiento || ""}
                onChange={(e) =>
                  handleChange("gasto_alojamiento", e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Pasajes
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gasto_pasajes || ""}
                onChange={(e) => handleChange("gasto_pasajes", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Capacitación
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gastos_capacit || ""}
                onChange={(e) => handleChange("gastos_capacit", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Mov. Otros
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gastos_movil_otros || ""}
                onChange={(e) =>
                  handleChange("gastos_movil_otros", e.target.value)
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase">
                Otros Gastos
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded text-xs"
                value={values.gasto_otros || ""}
                onChange={(e) => handleChange("gasto_otros", e.target.value)}
              />
            </div>
          </div>
        </AccordionSection>

        {/* SECCIÓN RENDICIONES */}
        <AccordionSection
          title="Rendiciones (Valores)"
          icon={IconCheck}
          isOpen={openSections.rendiciones}
          onToggle={() => toggleSection("rendiciones")}
        >
          <div className="space-y-3 bg-green-50/50 p-2 rounded border border-green-100">
            {[
              { id: "rendicion_viaticos", label: "R. Viáticos" },
              { id: "rendicion_gasto_alojamiento", label: "R. Alojamiento" },
              { id: "rendicion_gasto_pasajes", label: "R. Pasajes" },
              { id: "rendicion_gasto_combustible", label: "R. Combustible" },
              { id: "rendicion_gastos_movil_otros", label: "R. Mov. Otros" },
              { id: "rendicion_gastos_capacit", label: "R. Capacitación" },
              { id: "rendicion_transporte_otros", label: "R. Otros Transp." },
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

      {/* FOOTER */}
      <div className="p-4 border-t bg-slate-50 mt-auto">
        {!showExportMenu ? (
          <div className="space-y-3">
            <button
              onClick={onApply}
              disabled={loading || isExporting}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 flex justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <IconLoader className="animate-spin" /> : <IconSave />}{" "}
              Aplicar Cambios
            </button>
            <hr className="border-slate-200" />
            <button
              onClick={() => setShowExportMenu(true)}
              disabled={loading || isExporting}
              className="w-full py-3 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <IconCloudUpload /> Exportar a Drive...{" "}
              <IconChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-3 bg-white border border-green-200 rounded-lg p-3 shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-green-800 uppercase">
                Qué exportar:
              </h4>
              <button
                onClick={() => setShowExportMenu(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <IconArrowLeft size={10} /> Volver
              </button>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                />
                <span className="flex-1">1. Viático</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                />
                <span className="flex-1">2. Destaque (Sin montos)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                />
                <span className="flex-1">3. Rendición</span>
              </label>

              <div className="h-px bg-slate-100 my-1"></div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                />
                <span className="flex-1 flex items-center gap-1">
                  <IconFileText size={10} /> Doc. Común
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
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
                />
                <span className="flex-1 flex items-center gap-1">
                  <IconFileText size={10} /> Doc. Reducida
                </span>
              </label>

              <div className="h-px bg-slate-100 my-1"></div>

              <div
                onClick={() =>
                  setExportOptions((prev) => ({
                    ...prev,
                    unifyFiles: !prev.unifyFiles,
                  }))
                }
                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-2 rounded border border-slate-100 mt-2 bg-slate-50"
              >
                <div
                  className={`w-9 h-5 flex items-center rounded-full p-1 duration-300 ${exportOptions.unifyFiles ? "bg-indigo-500" : "bg-slate-300"}`}
                >
                  <div
                    className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ${exportOptions.unifyFiles ? "translate-x-4" : "translate-x-0"}`}
                  ></div>
                </div>

                <div className="flex flex-col">
                  <span className="font-bold text-[10px] uppercase text-slate-500">
                    {exportOptions.unifyFiles
                      ? "Archivo Unificado"
                      : "Archivos Separados"}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    {exportOptions.unifyFiles ? (
                      <IconUsers size={10} />
                    ) : (
                      <IconUser size={10} />
                    )}
                    {exportOptions.unifyFiles
                      ? "1 Solo PDF Gigante"
                      : "1 PDF por persona"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmExport}
              disabled={loading || isExporting || !isAnyOptionSelected}
              className={`w-full py-2 text-xs font-bold rounded shadow flex justify-center gap-2 transition-colors mt-2 ${
                isExporting
                  ? "bg-slate-100 text-slate-400"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isExporting ? (
                <IconLoader className="animate-spin" />
              ) : (
                <IconCloudUpload />
              )}
              Confirmar Exportación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
