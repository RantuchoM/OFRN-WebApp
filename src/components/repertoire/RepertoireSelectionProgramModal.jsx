import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  IconX,
  IconCheck,
  IconLoader,
  IconCalendarPlus,
  IconPlus,
  IconAlertCircle,
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import { bulkAssignWorksToRepertoireBlock } from "../../services/repertoireSelectionBulkService";
const PROGRAM_TYPE_OPTIONS = [
  "Sinfónico",
  "Camerata Filarmónica",
  "Ensamble",
  "Jazz Band",
  "Comisión",
];

const joinDisplayParts = (separator, ...parts) =>
  parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(separator);

export default function RepertoireSelectionProgramModal({  supabase,
  workIds,
  workCount,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(PROGRAM_TYPE_OPTIONS));
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [bloques, setBloques] = useState([]);
  const [selectedBloqueId, setSelectedBloqueId] = useState("");
  const [isCreatingBloque, setIsCreatingBloque] = useState(false);
  const [newBloqueName, setNewBloqueName] = useState("");

  useEffect(() => {
    const fetchPrograms = async () => {
      setProgramsLoading(true);
      const { data, error } = await supabase
        .from("programas")
        .select("id, nombre_gira, mes_letra, nomenclador, tipo, fecha_desde")
        .order("fecha_desde", { ascending: false })
        .limit(150);

      if (error) {
        toast.error("No se pudieron cargar los programas.");
        console.error(error);
      } else {
        setPrograms(data || []);
      }
      setProgramsLoading(false);
    };
    fetchPrograms();
  }, [supabase]);

  useEffect(() => {
    if (!selectedProgramId) {
      setBloques([]);
      setSelectedBloqueId("");
      setIsCreatingBloque(false);
      return;
    }

    const fetchBloques = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("programas_repertorios")
        .select("id, nombre, orden")
        .eq("id_programa", selectedProgramId)
        .order("orden", { ascending: true });
      setBloques(data || []);
      setSelectedBloqueId("");
      setIsCreatingBloque(false);
      setLoading(false);
    };
    fetchBloques();
  }, [selectedProgramId, supabase]);

  useEffect(() => {
    if (selectedProgramId && bloques.length === 0) {
      setIsCreatingBloque(true);
    }
  }, [selectedProgramId, bloques.length]);

  const filteredPrograms = useMemo(() => {
    if (selectedTypes.size === 0) return programs;
    return programs.filter((p) => selectedTypes.has(p.tipo));
  }, [programs, selectedTypes]);

  const programOptions = useMemo(
    () =>
      filteredPrograms.map((p) => {
        const label =
          joinDisplayParts(" | ", p.mes_letra, p.nombre_gira) ||
          `Programa ${p.id}`;
        const subLabel = joinDisplayParts(" · ", p.nomenclador, p.tipo);
        return {
          id: String(p.id),
          label,
          ...(subLabel ? { subLabel } : {}),
        };
      }),
    [filteredPrograms],
  );

  const bloqueOptions = useMemo(
    () =>
      bloques.map((b) => ({
        id: String(b.id),
        label: joinDisplayParts(" · ", b.nombre) || `Bloque ${b.id}`,
      })),
    [bloques],
  );
  const toggleType = (tipo) => {    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
    setSelectedProgramId("");
  };

  const handleAssign = async () => {
    if (!selectedProgramId) {
      toast.error("Seleccioná un programa.");
      return;
    }
    if (!selectedBloqueId && !newBloqueName.trim() && !isCreatingBloque) {
      toast.error("Seleccioná un bloque o creá uno nuevo.");
      return;
    }
    if (isCreatingBloque && !newBloqueName.trim()) {
      toast.error("Indicá el nombre del bloque nuevo.");
      return;
    }

    setLoading(true);
    try {
      const result = await bulkAssignWorksToRepertoireBlock(supabase, {
        programId: Number(selectedProgramId),
        blockId: isCreatingBloque ? null : selectedBloqueId,
        createBlockName: isCreatingBloque ? newBloqueName.trim() : null,
        workIds,
      });

      const parts = [
        `${result.inserted} obra(s) cargada(s) al final del bloque, en el orden de la selección.`,
      ];
      if (result.skippedDuplicates > 0) {
        parts.push(`${result.skippedDuplicates} ya estaban en ese bloque.`);
      }

      toast.success(parts.join(" "));
      onClose();
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar las obras.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconCalendarPlus className="text-indigo-600" /> Cargar a programa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {workCount} obra{workCount === 1 ? "" : "s"} en el orden guardado
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

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">
              Tipos de programa
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PROGRAM_TYPE_OPTIONS.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => toggleType(tipo)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-colors ${
                    selectedTypes.has(tipo)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
            {selectedTypes.size === 0 && (
              <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
                <IconAlertCircle size={10} /> Activá al menos un tipo para ver programas.
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Programa
            </label>
            {programsLoading ? (
              <div className="h-10 flex items-center px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-400">
                Cargando programas...
              </div>
            ) : selectedTypes.size === 0 ? (
              <div className="h-10 flex items-center px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-400">
                Activá al menos un tipo
              </div>
            ) : (
              <SearchableSelect
                options={programOptions}
                value={selectedProgramId || null}
                onChange={(id) => setSelectedProgramId(id ? String(id) : "")}
                placeholder={
                  programOptions.length === 0
                    ? "Sin programas para estos tipos"
                    : "Buscar programa..."
                }
                className="bg-white"
                dropdownMinWidth={320}
              />
            )}
          </div>
          {selectedProgramId && (
            <div className="animate-in slide-in-from-top-2 fade-in">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                Bloque de repertorio
              </label>
              {!isCreatingBloque ? (
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      options={bloqueOptions}
                      value={selectedBloqueId || null}
                      onChange={(id) => setSelectedBloqueId(id ? String(id) : "")}
                      placeholder={
                        bloques.length === 0
                          ? "Sin bloques — usá + para crear"
                          : "Buscar bloque..."
                      }
                      className="bg-white"
                    />
                  </div>                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingBloque(true);
                      setSelectedBloqueId("");
                    }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 hover:bg-indigo-100 shrink-0"
                    title="Crear bloque"
                  >
                    <IconPlus size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full p-2 border border-indigo-300 rounded-lg text-sm outline-none ring-2 ring-indigo-100"
                    placeholder="Nombre (ej: Programa I)"
                    value={newBloqueName}
                    onChange={(e) => setNewBloqueName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsCreatingBloque(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              )}
              {bloques.length === 0 && !isCreatingBloque && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                  <IconAlertCircle size={10} /> Sin bloques: creá uno con +.
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                Las obras se agregan al final del bloque, respetando el orden de la selección.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={
              loading ||
              !selectedProgramId ||
              (!selectedBloqueId && !isCreatingBloque) ||
              (isCreatingBloque && !newBloqueName.trim())
            }
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconCheck size={14} />
            )}
            Cargar obras
          </button>
        </div>
      </div>
    </div>
  );
}
