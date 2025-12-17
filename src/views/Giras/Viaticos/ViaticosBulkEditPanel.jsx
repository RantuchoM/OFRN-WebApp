import React from "react";
import {
  IconSave,
  IconLoader,
  IconX,
  IconCalendar,
  IconCloudUpload
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

      {/* BODY: FORMULARIOS */}
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
          <div className="flex items-center gap-2 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100">
            <span className="text-xs text-yellow-800">Días Calculados (Estimado):</span>
            <input
              type="number"
              step="0.5"
              className="bg-transparent w-full font-bold text-yellow-900 outline-none"
              value={values.dias_computables}
              disabled
              placeholder="-"
            />
          </div>
        </div>

        {/* SECCIÓN DATOS LABORALES */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase">Datos Laborales</label>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              className="p-2 border rounded text-xs"
              placeholder="Cargo/Función (Masivo)"
              value={values.cargo}
              onChange={(e) => setValues({ ...values, cargo: e.target.value })}
            />
            <input
              type="text"
              className="p-2 border rounded text-xs"
              placeholder="Jornada Laboral (Masivo)"
              value={values.jornada_laboral}
              onChange={(e) => setValues({ ...values, jornada_laboral: e.target.value })}
            />
          </div>
        </div>

        {/* SECCIÓN PORCENTAJE / TEMPORADA */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Porcentaje</label>
            <select
              className="w-full p-2 border rounded text-xs"
              onChange={(e) => setValues({ ...values, porcentaje: e.target.value })}
            >
              <option value="">--</option>
              <option value="100">100%</option>
              <option value="80">80%</option>
              <option value="0">0%</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Temporada</label>
            <select
              className="w-full p-2 border rounded text-xs"
              onChange={(e) => setValues({ ...values, es_temporada_alta: e.target.value })}
            >
              <option value="">--</option>
              <option value="true">Sí (Alta)</option>
              <option value="false">No (Baja)</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN GASTOS */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase">Gastos Adicionales</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className="p-2 border rounded text-xs" placeholder="Movilidad" onChange={(e) => setValues({ ...values, gastos_movilidad: e.target.value })} />
            <input type="number" className="p-2 border rounded text-xs" placeholder="Combustible" onChange={(e) => setValues({ ...values, gasto_combustible: e.target.value })} />
            <input type="number" className="p-2 border rounded text-xs" placeholder="Alojamiento" onChange={(e) => setValues({ ...values, gasto_alojamiento: e.target.value })} />
            <input type="number" className="p-2 border rounded text-xs" placeholder="Otros Var." onChange={(e) => setValues({ ...values, gasto_otros: e.target.value })} />
          </div>
        </div>

        {/* SECCIÓN TRANSPORTE */}
        <div className="space-y-2 border-t pt-4">
          <label className="text-xs font-bold text-slate-700 uppercase">Transporte (Checks)</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => setValues({ ...values, check_aereo: e.target.checked })} /> Aéreo</label>
            <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => setValues({ ...values, check_terrestre: e.target.checked })} /> Terrestre</label>
            <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => setValues({ ...values, check_patente_oficial: e.target.checked })} /> Oficial</label>
            <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => setValues({ ...values, check_patente_particular: e.target.checked })} /> Particular</label>
            <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => setValues({ ...values, check_otros: e.target.checked })} /> Otros</label>
          </div>
        </div>
      </div>

      {/* FOOTER: ACCIONES */}
      <div className="p-4 border-t bg-slate-50 space-y-3">
        {/* BOTÓN APLICAR CAMBIOS BD */}
        <button
          onClick={onApply}
          disabled={loading || isExporting}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 flex justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <IconLoader className="animate-spin" /> : <IconSave />} Aplicar Cambios
        </button>

        <hr className="border-slate-200" />

        {/* BOTÓN EXPORTAR DRIVE */}
        <button
          onClick={onExport}
          disabled={loading || isExporting}
          className={`w-full py-3 font-bold rounded shadow flex justify-center gap-2 transition-colors disabled:opacity-50 ${
            isExporting ? "bg-slate-100 text-slate-400" : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isExporting ? <IconLoader className="animate-spin" /> : <IconCloudUpload />}
          {isExporting ? "Procesando..." : "Generar PDFs en Drive"}
        </button>

        {/* STATUS DE EXPORTACIÓN */}
        {exportStatus && (
          <div className="text-[10px] text-center text-slate-500 font-mono bg-slate-100 p-2 rounded animate-pulse">
            {exportStatus}
          </div>
        )}
      </div>
    </div>
  );
}