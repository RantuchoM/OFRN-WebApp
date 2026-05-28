import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconLoader,
  IconPlus,
  IconTrash,
  IconX,
} from "../../components/ui/Icons";
import { getProgramStyle } from "../../utils/giraUtils";

const getMonthName = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(adjustedDate);
};

const formatDateDayMonth = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
};

const MultiFilterDropdown = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOption = (val) => {
    const nextSet = new Set(selected);
    if (val === "TODOS") {
      onChange(nextSet.has("TODOS") ? nextSet : new Set(["TODOS"]));
      setIsOpen(false);
      return;
    }
    if (nextSet.has("TODOS")) nextSet.delete("TODOS");
    if (nextSet.has(val)) nextSet.delete(val);
    else nextSet.add(val);
    if (nextSet.size === 0) nextSet.add("TODOS");
    onChange(nextSet);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
          selected.size > 0 && !selected.has("TODOS")
            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <IconFilter size={14} />
        {label} {selected.size > 0 && !selected.has("TODOS") && `(${selected.size})`}
        <IconChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div
            className={`p-2 border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-xs font-bold ${selected.has("TODOS") ? "text-indigo-600 bg-indigo-50/50" : "text-slate-500"}`}
            onClick={() => toggleOption("TODOS")}
          >
            Todos
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-lg cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selected.has(opt.value) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
                >
                  {selected.has(opt.value) && <IconCheck size={10} className="text-white" />}
                </div>
                <span className="text-xs text-slate-700">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function EnsembleProgramManager({ supabase, ensemble }) {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [dateRange, setDateRange] = useState("FUTURE");
  const [soloVinculados, setSoloVinculados] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set(["TODOS"]));
  const [selectedStates, setSelectedStates] = useState(new Set(["TODOS"]));
  const [selectedRelationship, setSelectedRelationship] = useState(new Set(["TODOS"]));

  const fetchData = useCallback(async () => {
    if (!ensemble?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from("programas")
        .select("id, nombre_gira, fecha_desde, fecha_hasta, tipo, estado, mes_letra, zona, nomenclador")
        .order("fecha_desde", { ascending: true });

      if (dateRange === "FUTURE") {
        const today = new Date().toISOString().split("T")[0];
        query = query.gte("fecha_hasta", today);
      }

      const { data: programsData, error: programsError } = await query;
      if (programsError) throw programsError;

      if (!programsData?.length) {
        setPrograms([]);
        return;
      }

      const programIds = programsData.map((p) => p.id);
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("giras_fuentes")
        .select("id, id_gira, tipo, valor_id")
        .in("id_gira", programIds)
        .eq("valor_id", Number(ensemble.id))
        .in("tipo", ["ENSAMBLE", "EXCL_ENSAMBLE"]);

      if (sourcesError) throw sourcesError;

      const sourceMap = {};
      (sourcesData || []).forEach((row) => {
        if (!sourceMap[row.id_gira]) {
          sourceMap[row.id_gira] = { include: false, exclude: false };
        }
        if (row.tipo === "ENSAMBLE") sourceMap[row.id_gira].include = true;
        if (row.tipo === "EXCL_ENSAMBLE") sourceMap[row.id_gira].exclude = true;
      });

      const processed = programsData.map((program) => {
        const flags = sourceMap[program.id] || { include: false, exclude: false };
        const relationship = flags.include
          ? "INCLUIDO"
          : flags.exclude
            ? "EXCLUIDO"
            : "NO_VINCULADO";
        return { ...program, relationship };
      });
      setPrograms(processed);
    } catch (error) {
      toast.error(`No se pudieron cargar los programas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [dateRange, ensemble?.id, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      if (soloVinculados && program.relationship === "NO_VINCULADO") return false;
      if (!selectedTypes.has("TODOS") && !selectedTypes.has(program.tipo)) return false;
      if (!selectedStates.has("TODOS") && !selectedStates.has(program.estado)) return false;
      if (!selectedRelationship.has("TODOS") && !selectedRelationship.has(program.relationship)) return false;
      return true;
    });
  }, [programs, selectedRelationship, selectedStates, selectedTypes, soloVinculados]);

  const applyRelationship = async (program, action) => {
    if (!ensemble?.id) return;
    setProcessingId(program.id);
    try {
      const ensembleId = Number(ensemble.id);
      const giraId = Number(program.id);

      if (action === "INCLUDE") {
        await supabase
          .from("giras_fuentes")
          .delete()
          .eq("id_gira", giraId)
          .eq("tipo", "ENSAMBLE")
          .eq("valor_id", ensembleId);

        await supabase
          .from("giras_fuentes")
          .delete()
          .eq("id_gira", giraId)
          .eq("tipo", "EXCL_ENSAMBLE")
          .eq("valor_id", ensembleId);

        const { error } = await supabase.from("giras_fuentes").insert({
          id_gira: giraId,
          tipo: "ENSAMBLE",
          valor_id: ensembleId,
          valor_texto: null,
        });
        if (error) throw error;
      }

      if (action === "EXCLUDE") {
        await supabase
          .from("giras_fuentes")
          .delete()
          .eq("id_gira", giraId)
          .eq("tipo", "ENSAMBLE")
          .eq("valor_id", ensembleId);

        await supabase
          .from("giras_fuentes")
          .delete()
          .eq("id_gira", giraId)
          .eq("tipo", "EXCL_ENSAMBLE")
          .eq("valor_id", ensembleId);

        const { error } = await supabase.from("giras_fuentes").insert({
          id_gira: giraId,
          tipo: "EXCL_ENSAMBLE",
          valor_id: ensembleId,
          valor_texto: null,
        });
        if (error) throw error;
      }

      if (action === "REMOVE") {
        const { error } = await supabase
          .from("giras_fuentes")
          .delete()
          .eq("id_gira", giraId)
          .eq("valor_id", ensembleId)
          .in("tipo", ["ENSAMBLE", "EXCL_ENSAMBLE"]);
        if (error) throw error;
      }

      await fetchData();
      toast.success("Cambio guardado.");
    } catch (error) {
      toast.error(`Error al actualizar programa: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const typeOptions = ["Sinfónico", "Camerata Filarmónica", "Ensamble", "Jazz Band", "Comisión"].map((type) => ({
    value: type,
    label: type,
  }));
  const stateOptions = ["Borrador", "Vigente", "Pausada"].map((state) => ({
    value: state,
    label: state,
  }));
  const relationshipOptions = [
    { value: "INCLUIDO", label: "Incluido" },
    { value: "EXCLUIDO", label: "Excluido" },
    { value: "NO_VINCULADO", label: "Sin vínculo" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0">
        <MultiFilterDropdown label="Tipo Programa" options={typeOptions} selected={selectedTypes} onChange={setSelectedTypes} />
        <MultiFilterDropdown label="Estado programa" options={stateOptions} selected={selectedStates} onChange={setSelectedStates} />
        <MultiFilterDropdown label="Vínculo" options={relationshipOptions} selected={selectedRelationship} onChange={setSelectedRelationship} />
        <button
          type="button"
          onClick={() => setSoloVinculados((prev) => !prev)}
          className={`text-[10px] font-bold px-3 py-2 rounded-lg border uppercase tracking-wider transition-colors ${
            soloVinculados
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Solo vinculados
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateRange((prev) => (prev === "FUTURE" ? "ALL" : "FUTURE"))}
            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wider"
          >
            {dateRange === "FUTURE" ? "Ver Historial" : "Ver Futuros"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 gap-3">
          {loading && programs.length === 0 && (
            <div className="p-10 flex justify-center text-slate-400">
              <IconLoader className="animate-spin" />
            </div>
          )}
          {!loading && filteredPrograms.length === 0 && (
            <div className="text-center py-10 text-slate-400 italic">No hay programas que coincidan con los filtros.</div>
          )}

          {filteredPrograms.map((program) => {
            const isProcessing = processingId === program.id;
            const style = getProgramStyle(program.tipo);
            const monthName = getMonthName(program.fecha_desde);
            const isIncluded = program.relationship === "INCLUIDO";
            const isExcluded = program.relationship === "EXCLUIDO";

            const bgClass = style.color.match(/bg-[-\w]+-\d+/)?.[0] || "bg-slate-50";
            const borderClass = style.color.match(/border-[-\w]+-\d+/)?.[0] || "border-slate-200";
            const textClass = style.color.match(/text-[-\w]+-\d+/)?.[0] || "text-slate-600";

            const cardClasses = isExcluded
              ? "bg-red-50 border border-red-200 border-l-4 border-l-red-400"
              : isIncluded
                ? `${bgClass} border ${borderClass} border-l-4 shadow-sm`
                : "bg-slate-50 border border-slate-200 border-l-4 border-l-slate-300";

            return (
              <div key={program.id} className={`p-4 rounded-xl transition-all shadow-sm ${cardClasses}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="p-2 rounded-lg bg-white/70 shadow-sm border border-black/5 shrink-0 flex flex-col items-center justify-center min-w-[3.5rem]">
                    <span className="text-sm font-black opacity-80 leading-none">{formatDateDayMonth(program.fecha_desde)}</span>
                    <span className="text-[9px] font-bold uppercase opacity-50 my-0.5">al</span>
                    <span className="text-sm font-black opacity-80 leading-none">{formatDateDayMonth(program.fecha_hasta)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1 opacity-70">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 rounded border bg-white ${borderClass} ${textClass}`}>
                        {program.tipo}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider border-l border-black/20 pl-2">
                        {program.zona || "Sin Zona"}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider border-l border-black/20 pl-2">
                        {program.mes_letra || monthName} | {program.nomenclador || ""}
                      </span>
                    </div>
                    <h4 className="font-bold text-base truncate text-slate-800">{program.nombre_gira}</h4>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                      {isIncluded && <span className="text-emerald-700">Incluido por ensamble</span>}
                      {isExcluded && <span className="text-red-700">Excluido por ensamble</span>}
                      {!isIncluded && !isExcluded && <span className="text-slate-500">Sin fuente para este ensamble</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isIncluded && (
                      <button
                        type="button"
                        onClick={() => void applyRelationship(program, "INCLUDE")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      >
                        {isProcessing ? <IconLoader className="animate-spin" size={14} /> : <IconPlus size={14} />}
                        Añadir
                      </button>
                    )}
                    {!isExcluded && (
                      <button
                        type="button"
                        onClick={() => void applyRelationship(program, "EXCLUDE")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 border border-red-200 text-red-600 hover:bg-red-50 bg-white"
                      >
                        {isProcessing ? <IconLoader className="animate-spin" size={14} /> : <IconX size={14} />}
                        Excluir
                      </button>
                    )}
                    {(isIncluded || isExcluded) && (
                      <button
                        type="button"
                        onClick={() => void applyRelationship(program, "REMOVE")}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 border border-slate-300 text-slate-600 hover:bg-slate-100 bg-white"
                      >
                        {isProcessing ? <IconLoader className="animate-spin" size={14} /> : <IconTrash size={14} />}
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
