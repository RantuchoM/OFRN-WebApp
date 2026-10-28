import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconUpload, IconUserPlus, IconX } from "../ui/Icons";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";
import { formatRolGiraLabel, DEFAULT_ROL_ID } from "../../utils/giraUtils";
import { canChooseFuncionGira } from "../../utils/funcionGira";
import FuncionGiraChoices from "./FuncionGiraChoices";
import { integranteKey } from "../../utils/integranteIds";

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function CheckList({ title, options, selected, onToggle }) {
  return (
    <div className="flex flex-col min-h-0 border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-2 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200">
        {title}
      </div>
      <div className="overflow-y-auto max-h-64 p-1 space-y-0.5">
        {(options || []).map((opt) => {
          const key = String(opt.value);
          const checked = selected.has(key) || selected.has(opt.value);
          return (
            <label
              key={key}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt.value)}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          );
        })}
        {(options || []).length === 0 && (
          <p className="px-2 py-3 text-[11px] text-slate-400">Sin opciones</p>
        )}
      </div>
    </div>
  );
}

export default function ConvocarModal({
  isOpen,
  onClose,
  supabase,
  rosterIds,
  rolesList,
  ensemblesList,
  familiesList,
  selectedEnsembles,
  selectedFamilies,
  selectedExclEnsembles,
  ausentes,
  loadingAction,
  onUpdateGroups,
  onAddPeople,
  onOpenExcel,
  onOpenVacancy,
  onOpenDetailedCreate,
}) {
  const [tab, setTab] = useState("individual");
  const [ens, setEns] = useState(() => new Set());
  const [fams, setFams] = useState(() => new Set());
  const [excl, setExcl] = useState(() => new Set());
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState({});
  const [rol, setRol] = useState(DEFAULT_ROL_ID);

  useEffect(() => {
    if (!isOpen) return;
    setTab("individual");
    setQuery("");
    setPicked({});
    setRol(DEFAULT_ROL_ID);
    setEns(new Set([...(selectedEnsembles || [])].map((v) => String(v))));
    setFams(new Set([...(selectedFamilies || [])].map((v) => String(v))));
    setExcl(new Set([...(selectedExclEnsembles || [])].map((v) => String(v))));
  }, [isOpen, selectedEnsembles, selectedFamilies, selectedExclEnsembles]);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    let cancelled = false;
    (async () => {
      setLoadingPeople(true);
      const { data, error } = await supabase
        .from("integrantes")
        .select(
          `id, nombre, apellido, nombre_preferencia, apellido_preferencia, mail, condicion, es_simulacion,
           instrumentos(instrumento, familia, rol_gira_default),
           integrantes_ensambles(id, id_ensamble, fecha_desde, fecha_hasta, ensambles(id, ensamble))`,
        )
        .eq("es_simulacion", false)
        .order("apellido", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        setPeople([]);
      } else {
        setPeople(data || []);
      }
      setLoadingPeople(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  const rosterKeySet = useMemo(
    () => new Set((rosterIds || []).map((id) => integranteKey(id))),
    [rosterIds],
  );

  const visiblePeople = useMemo(() => {
    const q = fold(query.trim());
    return (people || []).filter((p) => {
      if (rosterKeySet.has(integranteKey(p.id))) return false;
      if (!q) return true;
      const instrument = p.instrumentos?.instrumento || "";
      const blob = fold(
        `${p.apellido || ""} ${p.nombre || ""} ${p.apellido_preferencia || ""} ${p.nombre_preferencia || ""} ${instrument}`,
      );
      return blob.includes(q);
    });
  }, [people, query, rosterKeySet]);

  const pickedList = useMemo(
    () => people.filter((p) => picked[String(p.id)]),
    [people, picked],
  );

  const toggleSet = (setter, value) => {
    const key = String(value);
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePerson = (person) => {
    const key = String(person.id);
    setPicked((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { funcion: "", id_cubre_a: "" } };
    });
  };

  const setPersonFuncion = (id, patch) => {
    const key = String(id);
    setPicked((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { funcion: "", id_cubre_a: "" }), ...patch },
    }));
  };

  if (!isOpen) return null;

  const reemplazoFalta = pickedList.some((p) => {
    if (!canChooseFuncionGira(p, rol)) return false;
    const row = picked[String(p.id)];
    return row?.funcion === "reemplazo" && !row.id_cubre_a;
  });

  const handleConfirmIndividual = () => {
    if (!pickedList.length || reemplazoFalta) return;
    onAddPeople?.(
      pickedList.map((p) => ({
        person: {
          ...p,
          integrantes_ensambles: p.integrantes_ensambles,
        },
        rol,
        funcion: picked[String(p.id)]?.funcion || "",
        id_cubre_a: picked[String(p.id)]?.id_cubre_a || null,
        fechaDesde: giraFechaDesde,
      })),
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Convocar</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="px-4 pt-3 flex gap-2">
          {[
            { id: "individual", label: "Individual" },
            { id: "grupal", label: "Grupal" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                tab === t.id
                  ? "bg-fixed-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {tab === "grupal" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CheckList
                title="Ensambles"
                options={ensemblesList}
                selected={ens}
                onToggle={(v) => toggleSet(setEns, v)}
              />
              <CheckList
                title="Familias"
                options={familiesList}
                selected={fams}
                onToggle={(v) => toggleSet(setFams, v)}
              />
              <CheckList
                title="Excluir ensambles"
                options={ensemblesList}
                selected={excl}
                onToggle={(v) => toggleSet(setExcl, v)}
              />
            </div>
          )}
          {tab === "individual" && (
            <div className="space-y-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Buscar por nombre o instrumento (ej. "fagot")'
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                {loadingPeople && (
                  <p className="p-3 text-xs text-slate-400">Cargando padrón…</p>
                )}
                {!loadingPeople &&
                  visiblePeople.map((p) => {
                    const checked = Boolean(picked[String(p.id)]);
                    const instrument = p.instrumentos?.instrumento;
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePerson(p)}
                        />
                        <span className="truncate">
                          {seatingApellidoNombre(p)}
                          {instrument ? ` (${instrument})` : ""}
                        </span>
                      </label>
                    );
                  })}
                {!loadingPeople && visiblePeople.length === 0 && (
                  <p className="p-3 text-xs text-slate-400">Nadie coincide.</p>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenDetailedCreate}
                className="text-[11px] font-semibold text-fixed-indigo-600 hover:underline"
              >
                Nueva ficha completa…
              </button>
              <label className="block max-w-xs">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Rol en la gira
                </span>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  {(rolesList?.length ? rolesList : [{ id: DEFAULT_ROL_ID }]).map(
                    (r) => (
                      <option key={r.id} value={r.id}>
                        {formatRolGiraLabel(r.id)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {pickedList.some((p) => canChooseFuncionGira(p, rol)) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Función (solo externos con rol músico)
                  </p>
                  {pickedList
                    .filter((p) => canChooseFuncionGira(p, rol))
                    .map((p) => {
                      const row = picked[String(p.id)] || {
                        funcion: "",
                        id_cubre_a: "",
                      };
                      return (
                        <div
                          key={p.id}
                          className="flex flex-wrap items-center gap-2 text-xs"
                        >
                          <span className="font-semibold text-slate-700 min-w-[10rem]">
                            {seatingApellidoNombre(p)}
                          </span>
                          <FuncionGiraChoices
                            name={`funcion-convocar-${p.id}`}
                            value={row.funcion}
                            onChange={(id) =>
                              setPersonFuncion(p.id, {
                                funcion: id,
                                id_cubre_a:
                                  id === "reemplazo" ? row.id_cubre_a : "",
                              })
                            }
                          />
                          {row.funcion === "reemplazo" && (
                            <select
                              value={row.id_cubre_a}
                              onChange={(e) =>
                                setPersonFuncion(p.id, {
                                  id_cubre_a: e.target.value,
                                })
                              }
                              className="border border-slate-300 rounded px-2 py-1 bg-white"
                            >
                              <option value="">Ausente…</option>
                              {(ausentes || []).map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenExcel}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-fixed-indigo-700 hover:bg-fixed-indigo-50 rounded-lg"
            >
              <IconUpload size={12} />
              Individual (Excel)
            </button>
            <button
              type="button"
              onClick={onOpenVacancy}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded-lg"
            >
              <IconUserPlus size={12} />
              Nueva vacante
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg"
            >
              Cerrar
            </button>
            {tab === "grupal" ? (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onUpdateGroups?.(ens, fams, excl)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-fixed-indigo-600 rounded-lg disabled:opacity-40"
              >
                Actualizar
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  loadingAction || !pickedList.length || reemplazoFalta
                }
                onClick={handleConfirmIndividual}
                className="px-3 py-1.5 text-xs font-bold text-white bg-fixed-indigo-600 rounded-lg disabled:opacity-40"
              >
                Agregar ({pickedList.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
