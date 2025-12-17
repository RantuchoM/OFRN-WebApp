import React, { useState } from "react";
import {
  IconSave,
  IconLoader,
  IconX,
  IconCalendar,
  IconCloudUpload,
  IconFileText,
  IconArrowLeft,
  IconChevronRight
} from "../../../components/ui/Icons";
import DateInput from "../../../components/ui/DateInput";
import TimeInput from "../../../components/ui/TimeInput";

export default function ViaticosBulkEditPanel({
  selectionSize,
  onClose,
  values,
  setValues,
  onApply,
  loading,
  onExport,
  isExporting,
  exportStatus
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Opciones de exportación actualizadas
  const [exportOptions, setExportOptions] = useState({
    viatico: true,
    destaque: false,
    rendicion: false, // Ahora se puede activar
    docComun: false,
    docReducida: false
  });

  const handleConfirmExport = () => {
    onExport(exportOptions);
  };

  // Lógica de validación: habilita si al menos una opción está marcada
  const isAnyOptionSelected = 
    exportOptions.viatico || 
    exportOptions.destaque || 
    exportOptions.rendicion || 
    exportOptions.docComun || 
    exportOptions.docReducida;

  return (
    <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 z-40 absolute right-0 top-0 bottom-0">
      
      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center bg-indigo-50">
        <div>
          <h3 className="font-bold text-indigo-800">Edición Masiva</h3>
          <p className="text-xs text-indigo-600">{selectionSize} seleccionados</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white rounded-full text-indigo-400">
          <IconX size={18} />
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* SECCIÓN VIAJE */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
            <IconCalendar size={12} /> Viaje (Auto-cálculo)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <DateInput
              value={values.fecha_salida}
              onChange={(val) => setValues((prev) => ({ ...prev, fecha_salida: val }))}
              className="w-full border rounded text-xs px-2 py-2 h-9"
            />
            <TimeInput
              value={values.hora_salida}
              onChange={(val) => setValues((prev) => ({ ...prev, hora_salida: val }))}
              className="w-full border rounded text-xs px-2 py-2 h-9"
            />
            <DateInput
              value={values.fecha_llegada}
              onChange={(val) => setValues((prev) => ({ ...prev, fecha_llegada: val }))}
              className="w-full border rounded text-xs px-2 py-2 h-9"
            />
            <TimeInput
              value={values.hora_llegada}
              onChange={(val) => setValues((prev) => ({ ...prev, hora_llegada: val }))}
              className="w-full border rounded text-xs px-2 py-2 h-9"
            />
          </div>
        </div>

        {/* SECCIÓN DATOS LABORALES */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase">Datos Laborales</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-xs"
            placeholder="Cargo/Función"
            value={values.cargo}
            onChange={(e) => setValues({ ...values, cargo: e.target.value })}
          />
        </div>

        {/* SECCIÓN GASTOS */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase">Gastos Adicionales</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="p-2 border rounded text-xs" placeholder="Movilidad" value={values.gastos_movilidad} onChange={(e) => setValues({ ...values, gastos_movilidad: e.target.value })} />
            <input type="number" className="p-2 border rounded text-xs" placeholder="Combustible" value={values.gasto_combustible} onChange={(e) => setValues({ ...values, gasto_combustible: e.target.value })} />
          </div>
        </div>
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
              {loading ? <IconLoader className="animate-spin" /> : <IconSave />} Aplicar Cambios
            </button>
            <hr className="border-slate-200" />
            <button
              onClick={() => setShowExportMenu(true)}
              disabled={loading || isExporting}
              className="w-full py-3 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <IconCloudUpload /> Exportar a Drive... <IconChevronRight size={16}/>
            </button>
          </div>
        ) : (
          <div className="space-y-3 bg-white border border-green-200 rounded-lg p-3 shadow-inner">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-green-800 uppercase">Qué exportar:</h4>
                <button onClick={() => setShowExportMenu(false)} className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <IconArrowLeft size={10} /> Volver
                </button>
             </div>
          
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" checked={exportOptions.viatico} onChange={(e) => setExportOptions(prev => ({...prev, viatico: e.target.checked}))} className="rounded text-green-600" />
                <span className="flex-1">1. Viático</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" checked={exportOptions.destaque} onChange={(e) => setExportOptions(prev => ({...prev, destaque: e.target.checked}))} className="rounded text-green-600" />
                <span className="flex-1">2. Destaque (Sin montos)</span>
              </label>
              
              {/* OPCIÓN RENDICIÓN HABILITADA */}
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input 
                  type="checkbox" 
                  checked={exportOptions.rendicion} 
                  onChange={(e) => setExportOptions(prev => ({...prev, rendicion: e.target.checked}))}
                  className="rounded text-green-600" 
                />
                <span className="flex-1">3. Rendición</span>
              </label>
              
              <div className="h-px bg-slate-100 my-1"></div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" checked={exportOptions.docComun} onChange={(e) => setExportOptions(prev => ({...prev, docComun: e.target.checked}))} className="rounded text-green-600" />
                <span className="flex-1 flex items-center gap-1"><IconFileText size={10}/> Doc. Común</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                <input type="checkbox" checked={exportOptions.docReducida} onChange={(e) => setExportOptions(prev => ({...prev, docComun: e.target.checked}))} className="rounded text-green-600" />
                <span className="flex-1 flex items-center gap-1"><IconFileText size={10}/> Doc. Reducida</span>
              </label>
            </div>

            <button
              onClick={handleConfirmExport}
              disabled={loading || isExporting || !isAnyOptionSelected}
              className={`w-full py-2 text-xs font-bold rounded shadow flex justify-center gap-2 transition-colors mt-2 ${
                isExporting ? "bg-slate-100 text-slate-400" : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isExporting ? <IconLoader className="animate-spin" /> : <IconCloudUpload />}
              Confirmar Exportación
            </button>
          </div>
        )}
        {exportStatus && (
          <div className="text-[10px] text-center text-slate-500 font-mono bg-slate-100 p-2 rounded mt-2">
            {exportStatus}
          </div>
        )}
      </div>
    </div>
  );
}