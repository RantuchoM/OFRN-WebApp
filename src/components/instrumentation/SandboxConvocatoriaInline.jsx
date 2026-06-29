import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconChevronDown, IconLoader, IconSearch, IconX } from "../ui/Icons";
import { normalizeForSearch } from "../../utils/sanitize";
import { isRegionalConvocatoriaEnsamble } from "../../utils/convocatoriaEnsambleViews";
import {
  buildFuentesFromSets,
  computeManualIntegranteIds,
  diffFuentes,
  draftFuentesMatchProduction,
  draftIntegrantesMatchProduction,
  formatIntegranteHistogramLabel,
  fuentesToSourceSets,
  hasFuenteStructuralChange,
  resolveEnsambleLabel,
} from "../../utils/instrumentacionSandbox";
import {
  cloneProductionConvocatoria,
  upsertGiraDraft,
  deleteGiraDraft,
} from "../../services/instrumentacionSandboxService";
import { integranteKey } from "../../utils/integranteIds";

function applyIntegrantesOverrides(roster, overrides) {
  if (!overrides?.length) return roster || [];
  const byKey = new Map();
  overrides.forEach((o) => {
    byKey.set(integranteKey(o.id_integrante), o);
  });

  const seen = new Set();
  const merged = (roster || []).map((m) => {
    const kid = integranteKey(m.id);
    seen.add(kid);
    const ov = byKey.get(kid);
    if (ov) {
      return { ...m, estado_gira: ov.estado ?? "confirmado" };
    }
    return m;
  });

  overrides.forEach((o) => {
    const kid = integranteKey(o.id_integrante);
    if (seen.has(kid)) return;
    merged.push({
      id: o.id_integrante,
      apellido: "",
      nombre: "",
      estado_gira: o.estado ?? "confirmado",
    });
  });

  return merged;
}

function PickDropdown({ label, options, onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-0.5 px-1 py-0.5 text-[8px] font-bold border border-slate-200 rounded bg-white text-slate-600 hover:border-violet-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="truncate">{label}</span>
        <IconChevronDown size={10} className="shrink-0 text-slate-400" />
      </button>
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 z-[100] bg-white border border-slate-200 rounded shadow-lg max-h-28 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onPick(opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-1.5 py-1 text-[9px] text-slate-700 hover:bg-violet-50 truncate"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PickSearchDropdown({
  label,
  options,
  onPick,
  disabled,
  searchPlaceholder = "Buscar…",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef(null);
  const inputRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 160 });

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options.slice(0, 100);
    const q = normalizeForSearch(search);
    return options
      .filter((o) => normalizeForSearch(o.label).includes(q))
      .slice(0, 80);
  }, [options, search]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 168);
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: rect.bottom + 4, left, width });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        btnRef.current?.contains(e.target) ||
        e.target.closest(".sandbox-pick-search-portal")
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handlePick = (value) => {
    onPick(value);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={btnRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-0.5 px-1 py-0.5 text-[8px] font-bold border border-slate-200 rounded bg-white text-slate-600 hover:border-violet-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="truncate">{label}</span>
        <IconChevronDown size={10} className="shrink-0 text-slate-400" />
      </button>
      {open &&
        options.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="sandbox-pick-search-portal fixed z-[100] bg-white border border-slate-200 rounded shadow-lg overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            <div className="p-1 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <IconSearch
                  size={10}
                  className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "Enter" && filteredOptions.length === 1) {
                      handlePick(filteredOptions[0].value);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-4 pr-1 py-0.5 text-[9px] border border-slate-200 rounded outline-none focus:border-violet-400"
                />
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePick(opt.value)}
                    className="w-full text-left px-1.5 py-1 text-[9px] text-slate-700 hover:bg-violet-50 truncate"
                  >
                    {opt.label}
                  </button>
                ))
              ) : (
                <p className="px-1.5 py-2 text-[8px] text-slate-400 italic text-center">
                  Sin resultados
                </p>
              )}
              {!search.trim() && options.length > 100 && (
                <p className="px-1.5 py-1 text-[8px] text-slate-400 border-t border-slate-100">
                  {options.length} en total — escribí para filtrar
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function DraftChip({ label, variant = "add", changed, onRemove, title }) {
  const styles =
    variant === "excl"
      ? "bg-red-50 text-red-800 border-red-200"
      : variant === "quitar"
        ? "bg-red-50 text-red-700 border-red-200 line-through"
        : changed
          ? "bg-violet-50 text-violet-800 border-violet-300"
          : "bg-fixed-indigo-50 text-fixed-indigo-700 border-fixed-indigo-200";

  return (
    <span
      title={title || label}
      className={`inline-flex max-w-full items-center gap-0.5 pl-1 pr-0.5 py-0 rounded text-[8px] font-bold border uppercase leading-tight ${styles}`}
    >
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-0 text-slate-400 hover:text-red-600"
        >
          <IconX size={9} />
        </button>
      )}
    </span>
  );
}

export default function SandboxConvocatoriaInline({
  supabase,
  sandboxId,
  sandboxDisabled,
  program,
  draftEntry,
  draftRoster,
  prodRoster,
  prodIntegrantes = [],
  prodSources,
  draftSources,
  convDiffCols,
  stringsLabel,
  prodStringsLabel,
  ensambleLabels,
  ensemblesList,
  familiesList,
  integrantesList,
  onDraftSaved,
  onRequestApply,
  onDiscarded,
}) {
  const [saving, setSaving] = useState(false);
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [selectedExclEnsembles, setSelectedExclEnsembles] = useState(new Set());
  const [integrantes, setIntegrantes] = useState([]);
  const [integrantesReady, setIntegrantesReady] = useState(false);
  const [localDirty, setLocalDirty] = useState(false);
  const saveTimeoutRef = useRef(null);
  const saveGenerationRef = useRef(0);
  const gidRef = useRef(null);

  const hasDraft = !!draftEntry || localDirty;

  const regionalEnsembles = useMemo(
    () =>
      (ensemblesList || []).filter((e) =>
        isRegionalConvocatoriaEnsamble({ ensamble: e.label }),
      ),
    [ensemblesList],
  );

  const labelEns = useCallback(
    (id) => resolveEnsambleLabel(id, ensambleLabels, ensemblesList),
    [ensambleLabels, ensemblesList],
  );

  const prodFuentes = prodSources || [];

  const displayDraftFuentes = useMemo(() => {
    if (localDirty) {
      return buildFuentesFromSets(
        selectedEnsembles,
        selectedFamilies,
        selectedExclEnsembles,
      );
    }
    if (draftSources != null) return draftSources;
    if (draftEntry?.fuentes != null) return draftEntry.fuentes;
    return buildFuentesFromSets(
      selectedEnsembles,
      selectedFamilies,
      selectedExclEnsembles,
    );
  }, [
    localDirty,
    draftSources,
    draftEntry,
    selectedEnsembles,
    selectedFamilies,
    selectedExclEnsembles,
  ]);

  const fuenteDiff = useMemo(
    () =>
      hasDraft
        ? diffFuentes(prodFuentes, displayDraftFuentes)
        : { added: [], removed: [] },
    [hasDraft, prodFuentes, displayDraftFuentes],
  );

  const effectiveRoster = useMemo(() => {
    const base = draftRoster || prodRoster || [];
    if (localDirty && integrantes.length) {
      return applyIntegrantesOverrides(base, integrantes);
    }
    return base;
  }, [draftRoster, prodRoster, integrantes, localDirty]);

  const effectiveActiveByKey = useMemo(() => {
    const map = new Map();
    effectiveRoster.forEach((m) => {
      if (m.estado_gira !== "ausente") {
        map.set(integranteKey(m.id), m);
      }
    });
    return map;
  }, [effectiveRoster]);

  const hydrateFuentes = useCallback((fuentes) => {
    const sets = fuentesToSourceSets(fuentes || []);
    setSelectedEnsembles(sets.ensembles);
    setSelectedFamilies(sets.families);
    setSelectedExclEnsembles(sets.exclEnsembles);
  }, []);

  useEffect(() => {
    if (!program?.id) return;
    const gid = Number(program.id);
    if (gidRef.current !== gid) {
      gidRef.current = gid;
      setLocalDirty(false);
      setIntegrantesReady(false);
      setIntegrantes([]);
    }
    if (localDirty) return;
    if (draftEntry) {
      hydrateFuentes(draftEntry.fuentes);
      setIntegrantes(draftEntry.integrantes || []);
      setIntegrantesReady(true);
    } else {
      hydrateFuentes(prodFuentes);
      setIntegrantes([]);
      setIntegrantesReady(false);
    }
  }, [program?.id, draftEntry, prodFuentes, hydrateFuentes, localDirty]);

  const ensureIntegrantes = useCallback(async () => {
    if (integrantesReady) return integrantes;
    const cloned = await cloneProductionConvocatoria(supabase, program.id);
    setIntegrantes(cloned.integrantes || []);
    setIntegrantesReady(true);
    return cloned.integrantes || [];
  }, [integrantesReady, integrantes, supabase, program?.id]);

  const persistDraft = useCallback(
    async (ensembles, families, exclEnsembles, integrantesRows) => {
      if (!sandboxId || !program?.id || sandboxDisabled) return;
      const saveGen = ++saveGenerationRef.current;
      setLocalDirty(true);
      const fuentes = buildFuentesFromSets(ensembles, families, exclEnsembles);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          let ints;
          if (integrantesRows !== undefined) {
            ints =
              integrantesRows.length === 0
                ? (await cloneProductionConvocatoria(supabase, program.id))
                    .integrantes || []
                : integrantesRows;
          } else if (integrantes.length) {
            ints = integrantes;
          } else if (draftEntry?.integrantes?.length) {
            ints = draftEntry.integrantes;
          } else {
            ints = [];
          }

          const prodSnapshot = await cloneProductionConvocatoria(
            supabase,
            program.id,
          );
          const matchesProduction =
            draftFuentesMatchProduction(prodSnapshot.fuentes, fuentes) &&
            draftIntegrantesMatchProduction(
              prodSnapshot.integrantes,
              ints,
            );

          if (matchesProduction) {
            if (draftEntry) {
              await deleteGiraDraft(supabase, sandboxId, program.id);
            }
            if (saveGen !== saveGenerationRef.current) return;
            setIntegrantes([]);
            setIntegrantesReady(false);
            setLocalDirty(false);
            onDiscarded?.(program.id);
            return;
          }

          const row = await upsertGiraDraft(supabase, sandboxId, program.id, {
            fuentes,
            integrantes: ints,
          });
          if (saveGen !== saveGenerationRef.current) return;
          onDraftSaved?.(row);
          setLocalDirty(false);
        } catch (e) {
          console.error(e);
          toast.error("Error al guardar borrador.");
        } finally {
          if (saveGen === saveGenerationRef.current) {
            setSaving(false);
          }
        }
      }, 400);
    },
    [
      sandboxId,
      sandboxDisabled,
      supabase,
      program?.id,
      onDraftSaved,
      integrantesReady,
      integrantes,
      draftEntry,
      ensureIntegrantes,
      onDiscarded,
    ],
  );

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    [],
  );

  const applyGroupChange = (ensembles, families, exclEnsembles) => {
    setSelectedEnsembles(ensembles);
    setSelectedFamilies(families);
    setSelectedExclEnsembles(exclEnsembles);
    persistDraft(ensembles, families, exclEnsembles);
  };

  const agregarOptions = useMemo(() => {
    const opts = [];
    regionalEnsembles.forEach((e) => {
      const eid = Number(e.value);
      if (!selectedEnsembles.has(eid)) {
        opts.push({
          value: `ens:${eid}`,
          label: selectedExclEnsembles.has(eid)
            ? `${e.label} (excluido)`
            : e.label,
        });
      }
    });
    (familiesList || []).forEach((f) => {
      if (!selectedFamilies.has(f.value)) {
        opts.push({ value: `fam:${f.value}`, label: f.label });
      }
    });
    return opts;
  }, [
    regionalEnsembles,
    familiesList,
    selectedEnsembles,
    selectedExclEnsembles,
    selectedFamilies,
  ]);

  const quitarOptions = useMemo(() => {
    const opts = [];
    regionalEnsembles.forEach((e) => {
      const eid = Number(e.value);
      if (selectedEnsembles.has(eid)) {
        opts.push({ value: `ens:${eid}`, label: e.label });
      }
    });
    (familiesList || []).forEach((f) => {
      if (selectedFamilies.has(f.value)) {
        opts.push({ value: `fam:${f.value}`, label: f.label });
      }
    });
    return opts;
  }, [regionalEnsembles, familiesList, selectedEnsembles, selectedFamilies]);

  const excluirOptions = useMemo(
    () =>
      regionalEnsembles
        .filter((e) => !selectedExclEnsembles.has(Number(e.value)))
        .map((e) => ({ value: String(e.value), label: e.label })),
    [regionalEnsembles, selectedExclEnsembles],
  );

  const musicoAgregarOptions = useMemo(() => {
    const options = new Map();

    effectiveRoster
      .filter((m) => m.estado_gira === "ausente")
      .forEach((m) => {
        const kid = integranteKey(m.id);
        options.set(kid, {
          value: String(m.id),
          label: `${m.apellido}, ${m.nombre}`,
        });
      });

    (integrantesList || []).forEach((p) => {
      const kid = integranteKey(p.id);
      if (effectiveActiveByKey.has(kid)) return;
      if (!options.has(kid)) {
        options.set(kid, {
          value: String(p.id),
          label: formatIntegranteHistogramLabel(p, p.id),
        });
      }
    });

    return [...options.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    );
  }, [effectiveRoster, effectiveActiveByKey, integrantesList]);

  const musicoQuitarOptions = useMemo(
    () =>
      effectiveRoster
        .filter((m) => m.estado_gira !== "ausente")
        .map((m) => ({
          value: String(m.id),
          label: `${m.apellido}, ${m.nombre}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [effectiveRoster],
  );

  const handleAgregar = (value) => {
    if (value.startsWith("ens:")) {
      const eid = Number(value.slice(4));
      const next = new Set(selectedEnsembles);
      const nextExcl = new Set(selectedExclEnsembles);
      next.add(eid);
      nextExcl.delete(eid);
      applyGroupChange(next, selectedFamilies, nextExcl);
      return;
    }
    if (value.startsWith("fam:")) {
      const fam = value.slice(4);
      const next = new Set(selectedFamilies);
      next.add(fam);
      applyGroupChange(selectedEnsembles, next, selectedExclEnsembles);
    }
  };

  const handleQuitar = (value) => {
    if (value.startsWith("ens:")) {
      const eid = Number(value.slice(4));
      const next = new Set(selectedEnsembles);
      next.delete(eid);
      applyGroupChange(next, selectedFamilies, selectedExclEnsembles);
      return;
    }
    if (value.startsWith("fam:")) {
      const fam = value.slice(4);
      const next = new Set(selectedFamilies);
      next.delete(fam);
      applyGroupChange(selectedEnsembles, next, selectedExclEnsembles);
    }
  };

  const handleExcluir = (value) => {
    const eid = Number(value);
    const next = new Set(selectedExclEnsembles);
    const nextEns = new Set(selectedEnsembles);
    next.add(eid);
    nextEns.delete(eid);
    applyGroupChange(nextEns, selectedFamilies, next);
  };

  const handleAddPerson = async (person) => {
    const iid = Number(person?.id ?? person?.value);
    if (!iid) return;
    const ints = await ensureIntegrantes();
    const existing = ints.find((o) => Number(o.id_integrante) === iid);
    const next = existing
      ? ints.map((o) =>
          Number(o.id_integrante) === iid
            ? { ...o, estado: "confirmado" }
            : o,
        )
      : [...ints, { id_integrante: iid, estado: "confirmado" }];
    setIntegrantes(next);
    setIntegrantesReady(true);
    persistDraft(
      selectedEnsembles,
      selectedFamilies,
      selectedExclEnsembles,
      next,
    );
  };

  const handleMarkPersonAusente = async (person) => {
    const iid = Number(person?.id ?? person?.value);
    if (!iid) return;
    const ints = await ensureIntegrantes();
    const existing = ints.find((o) => Number(o.id_integrante) === iid);
    if (existing?.estado === "ausente") return;
    const next = existing
      ? ints.map((o) =>
          Number(o.id_integrante) === iid
            ? { ...o, estado: "ausente" }
            : o,
        )
      : [...ints, { id_integrante: iid, estado: "ausente" }];
    setIntegrantes(next);
    setIntegrantesReady(true);
    persistDraft(
      selectedEnsembles,
      selectedFamilies,
      selectedExclEnsembles,
      next,
    );
  };

  const revertAddedPerson = async (person) => {
    const iid = Number(person?.id ?? person?.value);
    if (!iid) return;
    const ints = await ensureIntegrantes();
    const prodPerson = (prodRoster || []).find(
      (r) => integranteKey(r.id) === integranteKey(iid),
    );
    let next;
    if (!prodPerson) {
      next = ints.filter((x) => Number(x.id_integrante) !== iid);
    } else {
      const productionEstado =
        prodPerson.estado_gira === "ausente" ? "ausente" : "confirmado";
      const existing = ints.find((o) => Number(o.id_integrante) === iid);
      next = existing
        ? ints.map((o) =>
            Number(o.id_integrante) === iid
              ? { ...o, estado: productionEstado }
              : o,
          )
        : ints;
    }
    setIntegrantes(next);
    setIntegrantesReady(true);
    persistDraft(
      selectedEnsembles,
      selectedFamilies,
      selectedExclEnsembles,
      next,
    );
  };

  const undoRemovedPerson = async (person) => {
    const iid = Number(person?.id ?? person?.value);
    if (!iid) return;
    const [prodSnapshot, ints] = await Promise.all([
      cloneProductionConvocatoria(supabase, program.id),
      ensureIntegrantes(),
    ]);
    const prodIntegranteIds = new Set(
      (prodSnapshot.integrantes || []).map((o) => Number(o.id_integrante)),
    );
    const existing = ints.find((o) => Number(o.id_integrante) === iid);
    if (!existing) return;

    let next;
    if (prodIntegranteIds.has(iid)) {
      const prodPerson = (prodRoster || []).find(
        (r) => integranteKey(r.id) === integranteKey(iid),
      );
      const productionEstado =
        prodPerson?.estado_gira === "ausente" ? "ausente" : "confirmado";
      next = ints.map((o) =>
        Number(o.id_integrante) === iid
          ? { ...o, estado: productionEstado }
          : o,
      );
    } else {
      next = ints.filter((o) => Number(o.id_integrante) !== iid);
    }
    setIntegrantes(next);
    setIntegrantesReady(true);
    persistDraft(
      selectedEnsembles,
      selectedFamilies,
      selectedExclEnsembles,
      next,
    );
  };

  const handleDiscard = async () => {
    if (!sandboxId || !program) return;
    try {
      if (draftEntry) {
        await deleteGiraDraft(supabase, sandboxId, program.id);
      }
      gidRef.current = null;
      setLocalDirty(false);
      hydrateFuentes(prodFuentes);
      setIntegrantes([]);
      setIntegrantesReady(false);
      onDiscarded?.(program.id);
      toast.success("Borrador descartado.");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo descartar el borrador.");
    }
  };

  const draftIntegrantesForDisplay = useMemo(() => {
    if (localDirty && integrantes.length) return integrantes;
    if (draftEntry?.integrantes?.length) return draftEntry.integrantes;
    return integrantesReady ? integrantes : [];
  }, [localDirty, integrantes, draftEntry, integrantesReady]);

  const manualIntegranteIds = useMemo(
    () =>
      computeManualIntegranteIds(
        draftIntegrantesForDisplay,
        prodIntegrantes,
        prodRoster,
      ),
    [draftIntegrantesForDisplay, prodIntegrantes, prodRoster],
  );

  const fuenteStructuralChange = useMemo(
    () => hasFuenteStructuralChange(fuenteDiff),
    [fuenteDiff],
  );

  const removedPersons = useMemo(() => {
    if (!hasDraft) return [];
    const rows = (prodRoster || [])
      .filter((m) => m.estado_gira !== "ausente")
      .filter((m) => {
        const d = effectiveRoster.find(
          (r) => integranteKey(r.id) === integranteKey(m.id),
        );
        return !d || d.estado_gira === "ausente";
      });
    if (!fuenteStructuralChange) return rows;
    return rows.filter((m) => manualIntegranteIds.has(Number(m.id)));
  }, [
    hasDraft,
    prodRoster,
    effectiveRoster,
    fuenteStructuralChange,
    manualIntegranteIds,
  ]);

  const addedPersons = useMemo(() => {
    if (!hasDraft) return [];
    const rows = effectiveRoster.filter((m) => {
      if (m.estado_gira === "ausente") return false;
      const p = (prodRoster || []).find(
        (r) => integranteKey(r.id) === integranteKey(m.id),
      );
      return !p || p.estado_gira === "ausente";
    });
    if (!fuenteStructuralChange) return rows;
    return rows.filter((m) => manualIntegranteIds.has(Number(m.id)));
  }, [
    hasDraft,
    prodRoster,
    effectiveRoster,
    fuenteStructuralChange,
    manualIntegranteIds,
  ]);

  const hasStringsDelta =
    stringsLabel != null &&
    prodStringsLabel != null &&
    stringsLabel !== prodStringsLabel;

  const hasModified =
    hasDraft &&
    (fuenteDiff.added.length > 0 ||
      fuenteDiff.removed.length > 0 ||
      removedPersons.length > 0 ||
      addedPersons.length > 0 ||
      convDiffCols?.size > 0 ||
      hasStringsDelta);

  return (
    <div
      className="flex flex-col min-h-0 border-l border-slate-100 bg-slate-50/40"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 px-1 py-0.5 flex flex-col gap-0.5 border-b border-slate-100">
        <div className="flex gap-0.5">
          <PickDropdown
            label="Agregar"
            options={agregarOptions}
            onPick={handleAgregar}
            disabled={sandboxDisabled}
          />
          <PickDropdown
            label="Quitar"
            options={quitarOptions}
            onPick={handleQuitar}
            disabled={sandboxDisabled}
          />
          <PickDropdown
            label="Excluir"
            options={excluirOptions}
            onPick={handleExcluir}
            disabled={sandboxDisabled}
          />
        </div>
        <div className="flex gap-0.5 items-center">
          <PickSearchDropdown
            label="+ músico"
            options={musicoAgregarOptions}
            onPick={(value) => handleAddPerson({ id: Number(value) })}
            disabled={sandboxDisabled}
            searchPlaceholder="Buscar músico…"
          />
          <PickSearchDropdown
            label="- músico"
            options={musicoQuitarOptions}
            onPick={(value) => handleMarkPersonAusente({ id: Number(value) })}
            disabled={sandboxDisabled}
            searchPlaceholder="Buscar músico…"
          />
          {saving && (
            <IconLoader size={10} className="animate-spin text-slate-400 shrink-0 ml-auto" />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-1 py-0.5 overflow-y-auto">
        {sandboxDisabled && (
          <p className="text-[8px] text-amber-700 mb-0.5">Sin persistencia.</p>
        )}
        {hasModified ? (
          <div className="flex flex-wrap gap-0.5">
            {fuenteDiff.added.map((s, idx) => {
              const key = `${s.tipo}|${s.valor_id ?? ""}|${s.valor_texto ?? ""}|${idx}`;
              if (s.tipo === "ENSAMBLE") {
                const eid = Number(s.valor_id);
                return (
                  <DraftChip
                    key={key}
                    label={labelEns(eid)}
                    changed
                    onRemove={() => {
                      const next = new Set(selectedEnsembles);
                      next.delete(eid);
                      applyGroupChange(
                        next,
                        selectedFamilies,
                        selectedExclEnsembles,
                      );
                    }}
                  />
                );
              }
              if (s.tipo === "FAMILIA") {
                return (
                  <DraftChip
                    key={key}
                    label={s.valor_texto}
                    changed
                    onRemove={() => {
                      const next = new Set(selectedFamilies);
                      next.delete(s.valor_texto);
                      applyGroupChange(
                        selectedEnsembles,
                        next,
                        selectedExclEnsembles,
                      );
                    }}
                  />
                );
              }
              if (s.tipo === "EXCL_ENSAMBLE") {
                const eid = Number(s.valor_id);
                return (
                  <DraftChip
                    key={key}
                    label={labelEns(eid)}
                    variant="excl"
                    changed
                    onRemove={() => {
                      const next = new Set(selectedExclEnsembles);
                      next.delete(eid);
                      applyGroupChange(
                        selectedEnsembles,
                        selectedFamilies,
                        next,
                      );
                    }}
                  />
                );
              }
              return null;
            })}
            {fuenteDiff.removed.map((s, idx) => {
              const key = `rm-${s.tipo}|${s.valor_id ?? ""}|${s.valor_texto ?? ""}|${idx}`;
              if (s.tipo === "ENSAMBLE") {
                const eid = Number(s.valor_id);
                return (
                  <DraftChip
                    key={key}
                    label={labelEns(eid)}
                    variant="quitar"
                    onRemove={() => {
                      const next = new Set(selectedEnsembles);
                      next.add(eid);
                      applyGroupChange(
                        next,
                        selectedFamilies,
                        selectedExclEnsembles,
                      );
                    }}
                  />
                );
              }
              if (s.tipo === "FAMILIA") {
                return (
                  <DraftChip
                    key={key}
                    label={s.valor_texto}
                    variant="quitar"
                    onRemove={() => {
                      const next = new Set(selectedFamilies);
                      next.add(s.valor_texto);
                      applyGroupChange(
                        selectedEnsembles,
                        next,
                        selectedExclEnsembles,
                      );
                    }}
                  />
                );
              }
              if (s.tipo === "EXCL_ENSAMBLE") {
                const eid = Number(s.valor_id);
                return (
                  <DraftChip
                    key={key}
                    label={labelEns(eid)}
                    variant="quitar"
                    onRemove={() => {
                      const next = new Set(selectedExclEnsembles);
                      next.add(eid);
                      applyGroupChange(
                        selectedEnsembles,
                        selectedFamilies,
                        next,
                      );
                    }}
                  />
                );
              }
              return null;
            })}
            {addedPersons.map((m) => (
              <DraftChip
                key={`add-${m.id}`}
                label={
                  `${m.apellido || ""}, ${m.nombre || ""}`.replace(/^,\s*|,\s*$/g, "").trim() ||
                  `ID ${m.id}`
                }
                changed
                onRemove={() => revertAddedPerson(m)}
              />
            ))}
            {removedPersons.map((m) => (
              <DraftChip
                key={`aus-${m.id}`}
                label={
                  `${m.apellido || ""}, ${m.nombre || ""}`.replace(/^,\s*|,\s*$/g, "").trim() ||
                  `ID ${m.id}`
                }
                variant="quitar"
                onRemove={() => undoRemovedPerson(m)}
              />
            ))}
            {hasStringsDelta && (
              <DraftChip
                label={stringsLabel}
                changed
                title={`Productivo: ${prodStringsLabel}`}
              />
            )}
          </div>
        ) : hasDraft ? (
          <p className="text-[8px] text-violet-600 italic">
            Borrador guardado (ver matriz)
          </p>
        ) : (
          <p className="text-[8px] text-slate-400 italic">Sin cambios</p>
        )}
      </div>

      <div className="shrink-0 px-1 py-0.5 border-t border-slate-100 flex gap-0.5">
        <button
          type="button"
          disabled={!hasDraft || !sandboxId}
          onClick={() => onRequestApply?.(program)}
          className="flex-1 py-0.5 text-[8px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded disabled:opacity-40"
        >
          Aplicar
        </button>
        <button
          type="button"
          disabled={!hasDraft || !sandboxId}
          onClick={handleDiscard}
          className="px-1 py-0.5 text-[8px] font-medium text-slate-600 hover:bg-slate-200 rounded border border-slate-200 disabled:opacity-40"
        >
          ×
        </button>
      </div>
    </div>
  );
}
