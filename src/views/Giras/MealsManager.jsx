import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconUtensils,
  IconLoader,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconCalendar,
  IconX,
  IconInfo,
  IconEdit,
  IconCheck,
  IconUsers,
  IconChevronDown,
  IconBold,
  IconItalic,
  IconUnderline,
} from "../../components/ui/Icons";
import TimeInput from "../../components/ui/TimeInput";
import FoodMatrix from "../../components/logistics/FoodMatrix";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner"; 

// --- CONSTANTES ---
const SERVICE_IDS = { Desayuno: 7, Almuerzo: 8, Merienda: 9, Cena: 10 };
const ID_TO_SERVICE = {
  7: "Desayuno",
  8: "Almuerzo",
  9: "Merienda",
  10: "Cena",
};
const SERVICIOS = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const SERVICE_VALS = { Desayuno: 0, Almuerzo: 1, Merienda: 2, Cena: 3 };

const getGroupLabelShort = (id, catalogs) => {
  if (id === "GRP:TUTTI") return "Tutti";
  if (id === "GRP:NO_LOCALES") return "No Locales";
  if (id === "GRP:LOCALES") return "Locales";
  if (id === "GRP:PRODUCCION") return "Prod.";
  if (id === "GRP:SOLISTAS") return "Sol.";
  if (id === "GRP:DIRECTORES") return "Dir.";
  if (id.startsWith("LOC:")) {
    const locId = id.split(":")[1];
    const loc = catalogs?.localidades?.find(
      (l) => String(l.id) === String(locId),
    );
    return loc ? loc.localidad : "Loc";
  }
  if (id.startsWith("FAM:")) return id.split(":")[1];
  return id;
};

// --- COMPONENTE: INSPECTOR DE GRUPOS SUPERIOR ---
const GroupInspectorHeader = ({ roster, catalogs }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const groups = [
    {
      id: "GRP:TUTTI",
      label: "Tutti",
      color: "bg-indigo-100 text-indigo-700",
      filter: (p) => p.estado_gira === "confirmado",
    },
    {
      id: "GRP:NO_LOCALES",
      label: "No Locales",
      color: "bg-purple-100 text-purple-700",
      filter: (p) => !p.is_local && p.estado_gira === "confirmado",
    },
    {
      id: "GRP:LOCALES",
      label: "Locales",
      color: "bg-orange-100 text-orange-700",
      filter: (p) => p.is_local && p.estado_gira === "confirmado",
    },
    {
      id: "GRP:PRODUCCION",
      label: "Prod.",
      color: "bg-slate-100 text-slate-700",
      filter: (p) =>
        p.rol_gira === "produccion" && p.estado_gira === "confirmado",
    },
    {
      id: "GRP:SOLISTAS",
      label: "Sol.",
      color: "bg-amber-100 text-amber-700",
      filter: (p) => p.rol_gira === "solista" && p.estado_gira === "confirmado",
    },
    {
      id: "GRP:DIRECTORES",
      label: "Dir.",
      color: "bg-red-100 text-red-700",
      filter: (p) =>
        p.rol_gira === "director" && p.estado_gira === "confirmado",
    },
  ];

  return (
    <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-4 relative">
      <style>{`.tooltip-bridge::after { content: ""; position: absolute; top: 100%; left: 0; width: 100%; height: 15px; background: transparent; }`}</style>
      {groups.map((g) => {
        const count = roster.filter(g.filter).length;
        return (
          <div
            key={g.id}
            className="relative tooltip-bridge"
            onMouseEnter={() => setSelectedGroup(g.id)}
            onMouseLeave={() => setSelectedGroup(null)}
          >
            <button
              className={`text-[10px] px-2 py-1 rounded font-bold border border-slate-200 bg-white transition-colors ${selectedGroup === g.id ? g.color : "text-slate-500"}`}
            >
              {g.label}: <span className="font-black">{count}</span>
            </button>

            {selectedGroup === g.id && (
              <div className="absolute top-[calc(100%+5px)] left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2 animate-in fade-in zoom-in-95 origin-top">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1 border-b pb-1">
                  Integrantes de {getGroupLabelShort(g.id, catalogs)}
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  {roster
                    .filter(g.filter)
                    .sort((a, b) => a.apellido.localeCompare(b.apellido))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="text-[10px] py-0.5 flex justify-between border-b border-slate-50 last:border-0"
                      >
                        <span className="truncate">
                          {p.apellido}, {p.nombre[0]}.
                        </span>
                        <span className="text-slate-400 italic text-[8px]">
                          {p.instrumentos?.instrumento?.substring(0, 12)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- COMPONENTE: SELECT DE UBICACIÓN BUSCABLE ---
const GridLocationSelect = ({
  value,
  onChange,
  options,
  disabled,
  isDirty,
  placeholder = "- Lugar -",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const selectedOption = options.find((o) => String(o.id) === String(value));
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full text-xs border rounded p-1 truncate min-h-[26px] cursor-pointer hover:border-indigo-400 transition-all ${
          isOpen ? "border-indigo-500 ring-1 ring-indigo-200" : "border-slate-300"
        } ${isDirty ? "bg-amber-50 border-amber-300" : "bg-white"}`}
      >
        {selectedOption ? (
          <span className="text-slate-700">{selectedOption.label}</span>
        ) : (
          <span className="text-slate-400 italic">{placeholder}</span>
        )}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-64 bg-white border border-slate-300 shadow-xl rounded-lg z-[99999] mt-1 flex flex-col overflow-hidden">
          <div className="p-2 bg-slate-50 border-b border-slate-200">
            <input
              autoFocus
              type="text"
              className="w-full p-1.5 text-xs border rounded outline-none focus:border-indigo-500 text-slate-800"
              placeholder="Buscar ubicación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-xs hover:bg-indigo-50 text-slate-700 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-slate-400 italic">
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MULTI SELECT DE GRUPOS ---
const MultiGroupSelect = ({
  value = [],
  onChange,
  catalogs,
  disabled,
  showAlert,
  isDirty,
  darkMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const groups = [
    { id: "GRP:TUTTI", label: "Tutti" },
    { id: "GRP:NO_LOCALES", label: "No Locales" },
    { id: "GRP:LOCALES", label: "Locales" },
    { id: "GRP:PRODUCCION", label: "Producción" },
    { id: "GRP:SOLISTAS", label: "Solistas" },
    { id: "GRP:DIRECTORES", label: "Directores" },
  ];

  const toggleOption = (id) => {
    let created = [...(value || [])];
    if (id === "GRP:TUTTI") created = ["GRP:TUTTI"];
    else {
      if (created.includes("GRP:TUTTI")) created = [];
      if (created.includes(id)) created = created.filter((x) => x !== id);
      else created.push(id);
    }
    onChange(created);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[28px] border rounded px-2 py-1 cursor-pointer flex flex-wrap gap-1 items-center transition-all ${
          darkMode
            ? "bg-indigo-800 border-indigo-600 text-white hover:border-indigo-400"
            : isDirty ? "bg-amber-50 border-amber-300" : "bg-white border-slate-300"
        } ${showAlert ? "border-orange-400 ring-1 ring-orange-200" : "hover:border-indigo-400"}`}
      >
        {!value.length && (
          <span
            className={`text-[10px] ${
              showAlert
                ? "text-orange-500 font-bold"
                : darkMode
                  ? "text-indigo-300 italic"
                  : "text-slate-400 italic"
            }`}
          >
            {showAlert ? "⚠️ Definir..." : "Seleccionar..."}
          </span>
        )}
        {value.map((id) => (
          <span
            key={id}
            className={`text-[9px] px-1 rounded border font-bold ${
              darkMode
                ? "bg-indigo-900 text-indigo-100 border-indigo-700"
                : "bg-indigo-50 text-indigo-700 border-indigo-100"
            }`}
          >
            {getGroupLabelShort(id, catalogs)}
          </span>
        ))}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-72 bg-white border border-slate-300 shadow-xl rounded-lg z-[999] mt-1 p-2 max-h-60 overflow-y-auto space-y-2">
          <div className="grid grid-cols-2 gap-1">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => toggleOption(g.id)}
                className={`text-[10px] p-1.5 rounded border cursor-pointer transition-colors ${value.includes(g.id) ? "bg-indigo-100 border-indigo-300 text-indigo-900 font-bold" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"}`}
              >
                {g.label}
              </div>
            ))}
          </div>
          <div className="border-t pt-2">
            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">
              Por Localidad
            </div>
            <div className="grid grid-cols-2 gap-1">
              {catalogs.localidades.map((l) => (
                <div
                  key={l.id}
                  onClick={() => toggleOption(`LOC:${l.id}`)}
                  className={`text-[10px] p-1.5 rounded border cursor-pointer truncate ${value.includes(`LOC:${l.id}`) ? "bg-purple-100 border-purple-300 font-bold text-purple-900" : "bg-slate-50 text-slate-700"}`}
                >
                  {l.localidad}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- PANEL DE EDICIÓN MASIVA ---
const BulkEditPanel = ({ selectedCount, onApply, onCancel, catalogs }) => {
  const [values, setValues] = useState({
    hora_inicio: "",
    id_locacion: "",
    convocados: [],
  });
  return (
    <div className="bg-indigo-700 border-b border-indigo-800 p-3 flex items-center justify-between text-white shadow-xl sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-white text-indigo-700 text-xs font-black px-2 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-xs font-black uppercase tracking-widest">
            Edición Masiva
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24">
            <TimeInput
              value={values.hora_inicio}
              onChange={(v) => setValues({ ...values, hora_inicio: v })}
              className="!bg-white !text-slate-900 h-8 text-xs border-none"
            />
          </div>
          <div className="w-48">
            <GridLocationSelect
              value={values.id_locacion}
              onChange={(v) => setValues({ ...values, id_locacion: v })}
              options={catalogs.locaciones}
            />
          </div>
          <div className="w-56">
            <MultiGroupSelect
              value={values.convocados}
              onChange={(v) => setValues({ ...values, convocados: v })}
              catalogs={catalogs}
              darkMode={false}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="text-indigo-200 hover:text-white text-xs font-bold px-3 py-1.5"
        >
          Cancelar
        </button>
        <button
          onClick={() => onApply(values)}
          className="bg-emerald-300 hover:bg-emerald-800 text-white text-xs font-black px-4 py-1.5 rounded shadow-md active:scale-95 transition-all flex items-center gap-1"
        >
          <IconCheck size={14} strokeWidth={3} /> Aplicar
        </button>
      </div>
    </div>
  );
};

export default function MealsManager({ supabase, gira, roster }) {
  const [loading, setLoading] = useState(false);
  const [grid, setGrid] = useState([]);
  const [catalogs, setCatalogs] = useState({
    locaciones: [],
    localidades: [],
    familias: [],
  });
  const [savingRows, setSavingRows] = useState(new Set());
  const [justSavedRows, setJustSavedRows] = useState(new Set()); // Para el destello verde
  const [expandedStats, setExpandedStats] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  // Filtros por tipo de servicio (D/A/M/C)
  const [serviceFilter, setServiceFilter] = useState(new Set(SERVICIOS));
  const debounceRef = useRef({});

  useEffect(() => {
    if (gira?.id) fetchAllData();
  }, [gira?.id]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: locs } = await supabase
        .from("locaciones")
        .select("id, nombre, localidades(localidad)")
        .order("nombre");
      const { data: locsGeo } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      const fams = [
        ...new Set(roster.map((m) => m.instrumentos?.familia).filter(Boolean)),
      ];
      setCatalogs({
        locaciones: (locs || []).map((l) => ({
          id: l.id,
          label: `${l.nombre} (${l.localidades?.localidad || ""})`,
        })),
        localidades: locsGeo || [],
        familias: fams,
      });
      await refreshGridData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refreshGridData = async () => {
    const { data: meals } = await supabase
      .from("eventos")
      .select("*")
      .eq("id_gira", gira.id)
      .in("id_tipo_evento", [7, 8, 9, 10]);
    const { data: rules } = await supabase
      .from("giras_logistica_reglas")
      .select("*")
      .eq("id_gira", gira.id);
    calculateGrid(meals || [], rules || []);
  };

  const calculateGrid = (mealsData, rulesData) => {
    const normalizedMeals = mealsData.map((m) => ({
      ...m,
      servicio: ID_TO_SERVICE[m.id_tipo_evento],
      hora_inicio: m.hora_inicio?.slice(0, 5),
      hora_fin: m.hora_fin?.slice(0, 5),
      dirty: false,
    }));
    const toIntKey = (d, s) =>
      d ? parseInt(`${d.replaceAll("-", "")}${SERVICE_VALS[s]}`) : null;
    let minKey = Infinity,
      maxKey = -Infinity;
    rulesData.forEach((r) => {
      if (r.comida_inicio_fecha)
        minKey = Math.min(
          minKey,
          toIntKey(
            r.comida_inicio_fecha,
            r.comida_inicio_servicio || "Desayuno",
          ),
        );
      if (r.comida_fin_fecha)
        maxKey = Math.max(
          maxKey,
          toIntKey(r.comida_fin_fecha, r.comida_fin_servicio || "Cena"),
        );
    });
    normalizedMeals.forEach((m) => {
      const k = toIntKey(m.fecha, m.servicio);
      if (k < minKey) minKey = k;
      if (k > maxKey) maxKey = k;
    });
    if (minKey === Infinity) {
      setGrid([]);
      return;
    }
    const newGrid = [];
    const minStr = String(minKey);
    let curDate = new Date(
      parseInt(minStr.substring(0, 4)),
      parseInt(minStr.substring(4, 6)) - 1,
      parseInt(minStr.substring(6, 8)),
    );
    const maxStr = String(maxKey);
    const endDate = new Date(
      parseInt(maxStr.substring(0, 4)),
      parseInt(maxStr.substring(4, 6)) - 1,
      parseInt(maxStr.substring(6, 8)),
    );
    while (curDate <= endDate) {
      const dStr = curDate.toISOString().split("T")[0];
      SERVICIOS.forEach((svc) => {
        const k = toIntKey(dStr, svc);
        if (k >= minKey && k <= maxKey) {
          const existing = normalizedMeals.find(
            (m) => m.fecha === dStr && m.servicio === svc,
          );
          newGrid.push(
            existing
              ? { ...existing, isTemp: false, dirty: false }
              : {
                  id: `temp-${dStr}-${svc}`,
                  fecha: dStr,
                  servicio: svc,
                  hora_inicio: "",
                  hora_fin: "",
                  descripcion: "",
                  id_locacion: "",
                  convocados: [],
                  visible_agenda: true,
                  tecnica: false,
                  isTemp: true,
                  dirty: false,
                },
          );
        }
      });
      curDate.setDate(curDate.getDate() + 1);
    }
    setGrid(newGrid);
  };

  const getEligiblePeople = (row) => {
    if (!row.convocados || row.convocados.length === 0) return [];
    return roster.filter((p) => {
      if (p.estado_gira !== "confirmado") return false;
      const isTechnicallyConvoked = row.convocados.some((tag) => {
        if (tag === "GRP:TUTTI") return true;
        if (tag === "GRP:LOCALES") return p.is_local;
        if (tag === "GRP:NO_LOCALES") return !p.is_local;
        if (tag === "GRP:PRODUCCION") {
          const rolesProduccion = [
            "produccion",
            "chofer",
            "acompañante",
            "staff",
            "mus_prod",
            "técnico",
            "iluminacion",
          ];
          return rolesProduccion.includes(p.rol_gira);
        }
        if (tag === "GRP:SOLISTAS") return p.rol_gira === "solista";
        if (tag === "GRP:DIRECTORES") return p.rol_gira === "director";
        if (tag.startsWith("LOC:"))
          return String(p.id_localidad) === String(tag.split(":")[1]);
        if (tag.startsWith("FAM:"))
          return p.instrumentos?.familia === tag.split(":")[1];
        return false;
      });
      if (!isTechnicallyConvoked) return false;
      const cFrom = p.logistics?.comida_inicio?.date,
        cTo = p.logistics?.comida_fin?.date;
      if (cFrom && cTo) {
        if (row.fecha < cFrom || row.fecha > cTo) return false;
      } else if (!p.is_local) return false;
      return true;
    });
  };

  const handleGridChange = (idx, field, val) => {
    setGrid((prev) => {
      const copy = [...prev];
      let row = { ...copy[idx], [field]: val, dirty: true };
      if (field === "convocados") {
        const labels = val.map((id) => getGroupLabelShort(id, catalogs));
        const autoDesc = `${row.servicio} ${labels.join(" + ")}`;
        if (!row.descripcion || row.descripcion.startsWith(row.servicio) || row.descripcion === "")
          row.descripcion = autoDesc;
      }
      if (field === "id_locacion" && (!row.descripcion || row.descripcion === "" || row.descripcion.startsWith(row.servicio))) {
        const locName = catalogs.locaciones.find((l) => String(l.id) === String(val))?.label?.split("(")[0].trim();
        if (locName) row.descripcion = `${row.servicio} en ${locName}`;
      }
      copy[idx] = row;
      if (debounceRef.current[row.id]) clearTimeout(debounceRef.current[row.id]);
      if (row.hora_inicio && row.fecha) {
        debounceRef.current[row.id] = setTimeout(() => saveRow(row), 1000);
      }
      return copy;
    });
  };

  const handleBulkApply = async (changes) => {
    const selectedIds = Array.from(selectedRows);

    const rowsToSave = grid
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => {
        const newRow = { ...r, dirty: true };

        if (changes.hora_inicio) {
          newRow.hora_inicio = changes.hora_inicio;
        }

        if (changes.id_locacion) {
          newRow.id_locacion = changes.id_locacion;
        }

        if (Array.isArray(changes.convocados) && changes.convocados.length > 0) {
          newRow.convocados = changes.convocados;
          newRow.descripcion = `${newRow.servicio} ${changes.convocados
            .map((id) => getGroupLabelShort(id, catalogs))
            .join(" + ")}`;
        }

        return newRow;
      });

    setSelectedRows(new Set());

    for (const row of rowsToSave) {
      if (row.fecha && row.hora_inicio) {
        await saveRow(row);
      }
    }

    refreshGridData();
  };

  const saveRow = async (row) => {
    if (!row.fecha || !row.hora_inicio) return;
    setSavingRows((prev) => new Set(prev).add(row.id));
    
    const payload = {
      id_gira: gira.id,
      fecha: row.fecha,
      id_tipo_evento: SERVICE_IDS[row.servicio],
      hora_inicio: row.hora_inicio || null,
      hora_fin: row.hora_fin || null,
      descripcion: row.descripcion || `${row.servicio} Gira`,
      id_locacion: row.id_locacion || null,
      convocados: row.convocados || [],
      visible_agenda: row.visible_agenda,
      tecnica: !!row.tecnica,
    };

    try {
      const { data } = row.isTemp
        ? await supabase.from("eventos").insert([payload]).select().single()
        : await supabase.from("eventos").update(payload).eq("id", row.id).select().single();
      
      setGrid((prev) =>
        prev.map((r) => r.id === row.id ? { ...data, servicio: ID_TO_SERVICE[data.id_tipo_evento], isTemp: false, dirty: false } : r)
      );

      // --- DESTELLO VERDE ---
      setJustSavedRows((prev) => new Set(prev).add(row.id));
      setTimeout(() => {
        setJustSavedRows((prev) => {
          const n = new Set(prev);
          n.delete(row.id);
          return n;
        });
      }, 1500); // 1.5 segundos de destello

    } catch (e) {
      console.error(e);
      toast.error("Error al guardar fila");
    } finally {
      setSavingRows((prev) => {
        const n = new Set(prev);
        n.delete(row.id);
        return n;
      });
    }
  };

  const deleteRow = async (row) => {
    if (row.isTemp) return;
    if (!confirm("¿Borrar este evento?")) return;
    setSavingRows((prev) => new Set(prev).add(row.id));
    await supabase.from("eventos").delete().eq("id", row.id);
    refreshGridData();
  };

  const [editingDescId, setEditingDescId] = useState(null);
  const [editingDescValue, setEditingDescValue] = useState("");
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0, visible: false });
  const editorRef = useRef(null);

  const filteredGrid = useMemo(() => {
    if (serviceFilter.size === 0) return [];
    return grid.filter((r) => serviceFilter.has(r.servicio));
  }, [grid, serviceFilter]);

  const realEventIds = useMemo(() => grid.filter((r) => !r.isTemp).map((r) => r.id), [grid]);

  const toggleServiceFilter = (svc) => {
    setServiceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  };

  const execDescCmd = (command) => {
    document.execCommand(command, false, null);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleDescPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleDescFocus = (e, row) => {
    setEditingDescId(row.id);
    setEditingDescValue(row.descripcion || "");
    editorRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();
    setToolbarPos({
      top: rect.top + window.scrollY - 40,
      left: rect.left + window.scrollX + 8,
      visible: true,
    });
  };

  const handleDescBlur = (row, idx) => {
    setToolbarPos((prev) => ({ ...prev, visible: false }));
    const newHtml = editorRef.current?.innerHTML ?? editingDescValue;
    if (newHtml !== (row.descripcion || "")) {
      handleGridChange(idx, "descripcion", newHtml);
    }
    setEditingDescId(null);
  };

  const handleDescKeyDown = (e, row, idx) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Forzamos blur + guardado
      e.currentTarget.blur();
      handleDescBlur(row, idx);
    }
  };
  const isMasterChecked = selectedRows.size === grid.length && grid.length > 0;
  const isOnlyRealSelected = selectedRows.size === realEventIds.length && realEventIds.every((id) => selectedRows.has(id)) && realEventIds.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0 z-10 relative">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <IconUtensils className="text-orange-500" />
            <h2 className="text-lg font-bold text-slate-800">Matriz de Comidas</h2>
          </div>
          <GroupInspectorHeader roster={roster} catalogs={catalogs} />
        </div>
        <div className="flex items-center gap-4">
          {/* Filtros rápidos por tipo de servicio: D/A/M/C */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <span className="mr-1 uppercase">Servicios:</span>
            {SERVICIOS.map((svc) => {
              const isActive = serviceFilter.has(svc);
              const short =
                svc === "Desayuno"
                  ? "D"
                  : svc === "Almuerzo"
                  ? "A"
                  : svc === "Merienda"
                  ? "M"
                  : "C";
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => toggleServiceFilter(svc)}
                  className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100"
                  }`}
                  title={svc}
                >
                  {short}
                </button>
              );
            })}
          </div>
          <FoodMatrix roster={roster} />
          {loading && <IconLoader className="animate-spin text-orange-500" />}
        </div>
      </div>

      {selectedRows.size > 0 && <BulkEditPanel selectedCount={selectedRows.size} onCancel={() => setSelectedRows(new Set())} onApply={handleBulkApply} catalogs={catalogs} />}

      {/* Barra de herramientas flotante para descripción (rich text) */}
      {toolbarPos.visible && (
        <div
          className="fixed z-40 bg-white border border-slate-200 rounded-lg shadow-md px-1.5 py-1 flex items-center gap-1 text-xs"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("bold");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Negrita"
          >
            <IconBold size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("italic");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Itálica"
          >
            <IconItalic size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              execDescCmd("underline");
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-700"
            title="Subrayado"
          >
            <IconUnderline size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col relative">
          <table className="w-full text-left text-sm min-w-[1300px] border-separate border-spacing-0">
            <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[10px] sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="w-1 border-b border-slate-200"></th>
                <th className="px-2 py-3 w-10 text-center border-b border-slate-200">
                  <div onClick={() => isMasterChecked ? setSelectedRows(new Set()) : isOnlyRealSelected ? setSelectedRows(new Set(grid.map((r) => r.id))) : setSelectedRows(new Set(realEventIds))} className={`w-4 h-4 mx-auto rounded border flex items-center justify-center cursor-pointer transition-colors ${isMasterChecked || isOnlyRealSelected ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"}`}>
                    {isMasterChecked ? <IconCheck size={10} strokeWidth={4} /> : isOnlyRealSelected ? <div className="w-2 h-0.5 bg-white"></div> : null}
                  </div>
                </th>
                <th className="px-3 py-3 w-28 border-r border-b border-slate-200">Día</th>
                <th className="px-3 py-3 w-24 border-b border-slate-200">Servicio</th>
                <th className="px-3 py-3 w-20 border-b border-slate-200">Horario</th>
                <th className="px-3 py-3 w-44 border-b border-slate-200">Lugar</th>
                <th className="px-3 py-3 w-64 border-b border-slate-200">Descripción</th>
                <th className="px-3 py-3 min-w-[150px] border-b border-slate-200">Convocados</th>
                <th className="px-3 py-3 w-24 text-center border-b border-slate-200">Comensales</th>
                <th className="px-3 py-3 w-12 text-center border-b border-slate-200">Téc</th>
                <th className="px-3 py-3 w-10 sticky right-0 bg-slate-100 border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrid.map((row) => {
                const idx = grid.findIndex((r) => r.id === row.id);
                const eligible = getEligiblePeople(row);
        const isSelected = selectedRows.has(row.id);
                const isSaving = savingRows.has(row.id);
                const isJustSaved = justSavedRows.has(row.id);
                const isDirty = row.dirty;
                const isTemp = row.isTemp;

        // --- LÓGICA DE COLORES POR ESTADO ---
        // Amarillo: procesando / pendiente de guardado
        // Verde: guardado OK (destello breve)
        // Rojo: error al guardar (se refleja vía toast; opcionalmente podríamos marcar la fila)
        const statusIndicatorClass = isSaving
          ? "bg-amber-400 animate-pulse" // procesando
          : isJustSaved
            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" // guardado OK
            : isDirty
              ? "bg-amber-300" // modificado pero aún no guardado
              : isTemp
                ? "bg-slate-300"
                : "bg-emerald-400 opacity-90";

        const rowBgClass = isSelected
          ? "bg-indigo-50"
          : isSaving
            ? "bg-amber-50" // procesando
            : isJustSaved
              ? "bg-emerald-100" // guardado OK
              : isDirty
                ? "bg-amber-50/60" // editado localmente
                : isTemp
                  ? "bg-slate-50/80 grayscale opacity-60 italic"
                  : "hover:bg-indigo-50/30";

                return (
                  <tr key={row.id} className={`${rowBgClass} group transition-all duration-700 ease-in-out`}>
                    <td className={`w-1 p-0 transition-all duration-300 ${statusIndicatorClass}`} title={isDirty ? "Pendiente de guardado" : "Sincronizado"}></td>
                    <td className="px-2 py-1 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => { const n = new Set(selectedRows); n.has(row.id) ? n.delete(row.id) : n.add(row.id); setSelectedRows(n); }} className="rounded text-indigo-600 focus:ring-0" />
                    </td>
                    <td className="px-3 py-3 font-bold border-r border-slate-200 text-slate-700">{format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}</td>
                    <td className="px-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${row.servicio === "Almuerzo" ? "bg-amber-50 text-amber-700 border-amber-200" : row.servicio === "Cena" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-400"}`}>{row.servicio}</span>
                    </td>
                    <td className="px-1">
                      <TimeInput value={row.hora_inicio || ""} onChange={(v) => handleGridChange(idx, "hora_inicio", v)} disabled={isSaving} isDirty={isDirty} />
                    </td>
                    <td className="px-1 relative">
                      <GridLocationSelect value={row.id_locacion || ""} onChange={(v) => handleGridChange(idx, "id_locacion", v)} options={catalogs.locaciones} disabled={isSaving} isDirty={isDirty} />
                    </td>
                    <td className="px-1">
                      <div
                        ref={editingDescId === row.id ? editorRef : null}
                        contentEditable={!isSaving}
                        suppressContentEditableWarning
                        onFocus={(e) => handleDescFocus(e, row)}
                        onBlur={() => handleDescBlur(row, idx)}
                        onKeyDown={(e) => handleDescKeyDown(e, row, idx)}
                        onPaste={handleDescPaste}
                        dangerouslySetInnerHTML={{ __html: row.descripcion || "" }}
                        className={`w-full text-xs border rounded p-1 outline-none transition-all min-h-[28px] ${
                          isDirty
                            ? "border-amber-300 bg-amber-50/50"
                            : "border-slate-300 bg-white"
                        }`}
                        placeholder="Descripción..."
                      />
                    </td>
                    <td className="px-1">
                      <MultiGroupSelect value={row.convocados} onChange={(v) => handleGridChange(idx, "convocados", v)} catalogs={catalogs} disabled={isSaving} isDirty={isDirty} showAlert={!isTemp && (!row.convocados || row.convocados.length === 0)} />
                    </td>
                    <td className="px-3 text-center relative">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-black cursor-pointer transition-all relative tooltip-bridge ${eligible.length > 0 ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-400"}`} onMouseEnter={() => setExpandedStats(row.id)} onMouseLeave={() => setExpandedStats(null)}>
                        <IconUsers size={12} /> {eligible.length}
                        {expandedStats === row.id && eligible.length > 0 && (
                          <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-64 bg-slate-800 text-white rounded-lg shadow-2xl z-[100] p-3 text-[10px] animate-in zoom-in-95 origin-top border border-white/10 text-left">
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-t border-white/10"></div>
                            <div className="relative z-10">
                              <div className="font-bold border-b border-white/10 pb-1 mb-2 uppercase tracking-tighter flex justify-between"><span>Comensales</span><span className="bg-white/20 px-1 rounded">{eligible.length}</span></div>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {eligible.sort((a, b) => a.apellido.localeCompare(b.apellido)).map((p) => (
                                  <div key={p.id} className="flex justify-between border-b border-white/5 py-1 last:border-0 hover:bg-white/5 px-1 rounded"><span className="truncate pr-2">{p.apellido}, {p.nombre[0]}.</span><span className="opacity-50 text-[8px] uppercase shrink-0 italic">{p.instrumentos?.instrumento?.substring(0, 10)}</span></div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 text-center">
                      <button onClick={() => handleGridChange(idx, "tecnica", !row.tecnica)} className={`transition-colors p-1 rounded-full hover:bg-slate-100 ${row.tecnica ? "text-indigo-600 bg-indigo-50" : "text-slate-300"}`}>{row.tecnica ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>
                    </td>
                    <td className="px-2 text-center sticky right-0 bg-white shadow-[-4px_0_10_px_-4px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">{isSaving ? <IconLoader className="animate-spin text-indigo-500 mx-auto" size={14} /> : !isTemp && <button onClick={() => deleteRow(row)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><IconTrash size={14} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}