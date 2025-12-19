import React, { useState, useEffect, useRef } from "react";
import { IconPlus, IconCheck, IconChevronDown, IconX } from "../ui/Icons";

export const CreateParticellaModal = ({ isOpen, onClose, onConfirm, instrumentList, defaultInstrumentId }) => {
  const [selectedInstr, setSelectedInstr] = useState(defaultInstrumentId || "");
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) setSelectedInstr(defaultInstrumentId || instrumentList[0]?.id || "");
  }, [isOpen, defaultInstrumentId, instrumentList]);

  useEffect(() => {
    const instrName = instrumentList.find((i) => i.id === selectedInstr)?.instrumento;
    if (instrName) setName(`PENDIENTE - ${instrName}`);
    else setName("PENDIENTE - Nueva Particella");
  }, [selectedInstr, instrumentList]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(selectedInstr, name);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <IconPlus className="text-indigo-600" /> Crear Particella Pendiente
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Instrumento (Base de Datos)</label>
            <select className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 bg-white" value={selectedInstr} onChange={(e) => setSelectedInstr(e.target.value)} required>
              <option value="" disabled>Seleccionar...</option>
              {instrumentList.map((i) => (<option key={i.id} value={i.id}>{i.instrumento}</option>))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre de Particella</label>
            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Flauta 1" autoFocus />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
            <button type="submit" className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm">Crear y Asignar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ParticellaSelect = ({ options, value, onChange, onRequestCreate, placeholder = "-", disabled = false, preferredInstrumentId = null, counts = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);
  const currentAssignedCount = value ? counts[value] || 0 : 0;
  const showCountLabel = currentAssignedCount > 1;

  if (disabled) return (
    <div className="w-full h-full min-h-[24px] px-1 text-[10px] border border-transparent flex items-center justify-center text-slate-600 bg-transparent truncate cursor-default" title={selectedOption?.nombre_archivo}>
      {selectedOption ? (<span>{selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento}{showCountLabel && (<span className="font-bold ml-1 text-slate-800">[x{currentAssignedCount}]</span>)}</span>) : ("-")}
    </div>
  );

  const filteredOptions = options.filter((o) => (o.nombre_archivo || "").toLowerCase().includes(search.toLowerCase()) || (o.instrumentos?.instrumento || "").toLowerCase().includes(search.toLowerCase()));
  const recommendedOptions = filteredOptions.filter((o) => o.id_instrumento === preferredInstrumentId);
  const otherOptions = filteredOptions.filter((o) => o.id_instrumento !== preferredInstrumentId);

  const handleSelect = (id) => { onChange(id); setIsOpen(false); setSearch(""); };
  const renderOption = (opt) => {
    const assignedCount = counts[opt.id] || 0;
    return (
      <button key={opt.id} onClick={() => handleSelect(opt.id)} className={`w-full text-left px-2 py-1 text-[10px] rounded hover:bg-indigo-50 flex items-center justify-between group ${value === opt.id ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
        <div className="truncate w-full">
          <div className="flex items-center justify-between w-full">
            <span className="block font-medium truncate text-slate-800">{opt.nombre_archivo || "Sin nombre"}</span>
            {assignedCount > 0 && (<span className="ml-1 text-[8px] bg-slate-100 text-slate-500 px-1 rounded-full border border-slate-200 shrink-0">{assignedCount}</span>)}
          </div>
          <span className="text-[9px] text-slate-400 font-normal truncate block">{opt.instrumentos?.instrumento || "Sin instr."}</span>
        </div>
        {value === opt.id && (<IconCheck size={10} className="text-indigo-600 shrink-0 ml-1" />)}
      </button>
    );
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full h-full min-h-[24px] text-left px-1 text-[10px] border rounded transition-colors flex items-center justify-between gap-0.5 ${value ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"}`}>
        <span className="truncate block w-full">{selectedOption ? (<>{selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento}{showCountLabel && (<span className="text-indigo-900 ml-1 font-extrabold">[x{currentAssignedCount}]</span>)}</>) : (placeholder)}</span>
        <IconChevronDown size={8} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} opacity-50`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-56 bg-white border border-slate-200 rounded shadow-xl mt-0.5 overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95">
          <div className="p-1 border-b border-slate-50 bg-slate-50 sticky top-0 flex flex-col gap-1">
            <input type="text" autoFocus className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded outline-none focus:border-indigo-400" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => { onRequestCreate(); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-100 flex items-center gap-2 font-bold transition-colors"><IconPlus size={12} /> Crear Nueva...</button>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <button onClick={() => handleSelect(null)} className="w-full text-left px-2 py-1 text-[10px] text-slate-400 hover:bg-red-50 hover:text-red-600 rounded flex items-center gap-2 mb-1"><IconX size={8} /> Quitar Asignación</button>
            {filteredOptions.length === 0 && (<div className="text-[10px] text-slate-400 p-2 text-center italic">No hay particellas</div>)}
            {recommendedOptions.length > 0 && (<><div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50 mt-1 mb-0.5 rounded">Sugeridos</div>{recommendedOptions.map(renderOption)}<div className="border-t border-slate-100 my-1"></div></>)}
            {otherOptions.length > 0 && recommendedOptions.length > 0 && (<div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mt-1 mb-0.5">Otros</div>)}
            {otherOptions.map(renderOption)}
          </div>
        </div>
      )}
    </div>
  );
};