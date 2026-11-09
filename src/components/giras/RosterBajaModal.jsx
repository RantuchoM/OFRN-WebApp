import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle, IconPlus, IconX } from "../ui/Icons";
import {
  BAJA_MOTIVO_OPCIONES,
  resolveBajaMotivoText,
} from "../../utils/rosterBajaMotivos";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";
import { integranteKey } from "../../utils/integranteIds";
import { coberturaLabelFromMusician } from "../../utils/coberturaGira";
import MusicianForm from "../../views/Musicians/MusicianForm";

export { BAJA_MOTIVO_OPCIONES, resolveBajaMotivoText } from "../../utils/rosterBajaMotivos";

const GROUP_BAJA_ACTIONS = new Set([
  "exclusion_ensamble",
  "cambio_grupos_baja",
]);
const GROUP_ALTA_ACTIONS = new Set(["cambio_grupos_alta"]);

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function isCondicionEstable(person) {
  return fold(person?.condicion) === "estable";
}

/** Apellido, Nombre (Instrumento) */
function personLabelWithInstr(person) {
  const name = seatingApellidoNombre(person) || "—";
  const instr = String(person?.instrumentos?.instrumento || "").trim();
  return instr ? `${name} (${instr})` : name;
}

function seedNameFromQuery(query) {
  const parts = String(query || "").trim().split(/\s+/).filter(Boolean);
  return {
    nombre: parts[0] || "",
    apellido: parts.slice(1).join(" ") || "",
  };
}

export default function RosterBajaModal({
  pendingBaja,
  canNotify,
  /** Convocatoria inicial enviada + notificaciones habilitadas (permite alta/baja de cobertura). */
  notificationsReady = false,
  isEditor,
  onClose,
  onConfirm,
  supabase,
  rosterIds = [],
}) {
  const [selectedMotivo, setSelectedMotivo] = useState("");
  const [otroText, setOtroText] = useState("");
  /** @type {'ninguno'|'reemplazo'|'licencia'|'cobertura'} */
  const [ausenciaAbono, setAusenciaAbono] = useState("ninguno");
  /** @type {'integrante'|'externo'} */
  const [coberturaMode, setCoberturaMode] = useState("integrante");
  const [coberturaQuery, setCoberturaQuery] = useState("");
  const [coberturaPeople, setCoberturaPeople] = useState([]);
  const [coberturaLoading, setCoberturaLoading] = useState(false);
  const [coberturaId, setCoberturaId] = useState("");
  const [coberturaNombre, setCoberturaNombre] = useState("");
  /** Externo sin ficha: solo texto (cobertura_nombre). */
  const [externoSoloNombre, setExternoSoloNombre] = useState(false);
  const [showCreatePerson, setShowCreatePerson] = useState(false);
  const [createSeed, setCreateSeed] = useState({ nombre: "", apellido: "" });
  const [confirmSkipNotify, setConfirmSkipNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectionById, setSelectionById] = useState({});

  const musician = pendingBaja?.musician;
  const action = pendingBaja?.action;
  const affectedMembers = pendingBaja?.affectedMembers || [];
  const isEditCobertura = action === "editar_cobertura";

  useEffect(() => {
    if (!pendingBaja) return;
    setSelectedMotivo("");
    setOtroText("");
    setConfirmSkipNotify(false);
    setSubmitting(false);
    setCoberturaQuery("");
    setShowCreatePerson(false);
    setExternoSoloNombre(false);
    const m = pendingBaja.musician;
    const hasCobertura =
      m?.cobertura_id_integrante != null ||
      String(m?.cobertura_nombre || "").trim();
    if (pendingBaja.action === "editar_cobertura") {
      if (m?.abona_reemplazo) {
        setAusenciaAbono("reemplazo");
        setCoberturaMode("integrante");
        setCoberturaId("");
        setCoberturaNombre("");
      } else if (m?.abona_licencia) {
        setAusenciaAbono("licencia");
        setCoberturaMode("integrante");
        setCoberturaId("");
        setCoberturaNombre("");
      } else if (hasCobertura) {
        setAusenciaAbono("cobertura");
        if (m?.cobertura_id_integrante != null) {
          setCoberturaMode("integrante");
          setCoberturaId(String(m.cobertura_id_integrante));
          setCoberturaNombre("");
          setExternoSoloNombre(false);
        } else {
          setCoberturaMode("externo");
          setCoberturaId("");
          setCoberturaNombre(String(m.cobertura_nombre || "").trim());
          setExternoSoloNombre(true);
        }
      } else {
        setAusenciaAbono("ninguno");
        setCoberturaMode("integrante");
        setCoberturaId("");
        setCoberturaNombre("");
      }
    } else if (hasCobertura) {
      setAusenciaAbono("cobertura");
      if (m?.cobertura_id_integrante != null) {
        setCoberturaMode("integrante");
        setCoberturaId(String(m.cobertura_id_integrante));
        setCoberturaNombre("");
        setExternoSoloNombre(false);
      } else {
        setCoberturaMode("externo");
        setCoberturaId("");
        setCoberturaNombre(String(m?.cobertura_nombre || "").trim());
        setExternoSoloNombre(true);
      }
    } else {
      setAusenciaAbono("ninguno");
      setCoberturaMode("integrante");
      setCoberturaId("");
      setCoberturaNombre("");
    }
    if (
      GROUP_BAJA_ACTIONS.has(pendingBaja.action) ||
      GROUP_ALTA_ACTIONS.has(pendingBaja.action)
    ) {
      const initial = {};
      (pendingBaja.affectedMembers || []).forEach((a) => {
        initial[a.member.id] = a.defaultSelected;
      });
      setSelectionById(initial);
    } else {
      setSelectionById({});
    }
  }, [
    pendingBaja?.integranteId,
    pendingBaja?.action,
    pendingBaja?.affectedMembers,
  ]);

  const rosterKeySet = useMemo(
    () => new Set((rosterIds || []).map((id) => integranteKey(id))),
    [rosterIds],
  );

  useEffect(() => {
    if (!pendingBaja || !supabase) return;
    if (ausenciaAbono !== "cobertura") return;
    let cancelled = false;
    (async () => {
      setCoberturaLoading(true);
      const { data, error } = await supabase
        .from("integrantes")
        .select(
          "id, mail, nombre, apellido, nombre_preferencia, apellido_preferencia, condicion, es_simulacion, instrumentos(instrumento)",
        )
        .eq("es_simulacion", false)
        .order("apellido", { ascending: true })
        .limit(1200);
      if (cancelled) return;
      if (error) {
        console.error(error);
        setCoberturaPeople([]);
      } else {
        const list = data || [];
        setCoberturaPeople(list);
        // Si ya había un id elegido, ubicar pestaña Estable / no Estable.
        setCoberturaId((currentId) => {
          if (!currentId) return currentId;
          const found = list.find(
            (p) => String(p.id) === String(currentId),
          );
          if (found) {
            setCoberturaMode(isCondicionEstable(found) ? "integrante" : "externo");
            setExternoSoloNombre(false);
            setCoberturaNombre("");
          }
          return currentId;
        });
      }
      setCoberturaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingBaja, supabase, ausenciaAbono]);

  const isGroupBaja = GROUP_BAJA_ACTIONS.has(action);
  const isGroupAlta = GROUP_ALTA_ACTIONS.has(action);
  const isGroupChange = isGroupBaja || isGroupAlta;

  const selectedCount = useMemo(() => {
    if (!isGroupChange) return 0;
    return affectedMembers.filter((a) => selectionById[a.member.id]).length;
  }, [isGroupChange, affectedMembers, selectionById]);

  const manualAffectedCount = useMemo(() => {
    if (!isGroupChange) return 0;
    return affectedMembers.filter((a) => a.isAlreadyManual).length;
  }, [isGroupChange, affectedMembers]);

  const selectedCoberturaPerson = useMemo(() => {
    if (!coberturaId) return null;
    return (
      (coberturaPeople || []).find(
        (p) => String(p.id) === String(coberturaId),
      ) || null
    );
  }, [coberturaPeople, coberturaId]);

  const prevCoberturaPerson = useMemo(() => {
    const prevId = musician?.cobertura_id_integrante;
    if (prevId == null) return null;
    return (
      (coberturaPeople || []).find((p) => String(p.id) === String(prevId)) ||
      null
    );
  }, [coberturaPeople, musician?.cobertura_id_integrante]);

  /** Cambio de cobertura con alguien a notificar (alta y/o baja). */
  const coberturaNotifyTargets = useMemo(() => {
    if (!notificationsReady) return { alta: false, baja: false };
    const prevId =
      musician?.cobertura_id_integrante != null
        ? Number(musician.cobertura_id_integrante)
        : null;
    const nextId =
      ausenciaAbono === "cobertura" && coberturaId
        ? Number(coberturaId)
        : null;
    const removingCover =
      prevId != null &&
      (ausenciaAbono !== "cobertura" || nextId !== prevId);
    const addingCover =
      ausenciaAbono === "cobertura" &&
      nextId != null &&
      nextId !== prevId;
    return {
      alta: Boolean(addingCover && selectedCoberturaPerson?.mail),
      baja: Boolean(removingCover && prevCoberturaPerson?.mail),
      prevId,
      nextId,
    };
  }, [
    notificationsReady,
    musician?.cobertura_id_integrante,
    ausenciaAbono,
    coberturaId,
    selectedCoberturaPerson?.mail,
    prevCoberturaPerson?.mail,
  ]);

  const effectiveCanNotify = useMemo(() => {
    if (isEditCobertura) {
      return coberturaNotifyTargets.alta || coberturaNotifyTargets.baja;
    }
    if (!isGroupChange) {
      // Ausente/desconvocar: mail del ausente y/o alta/baja de cobertura.
      if (canNotify) return true;
      return coberturaNotifyTargets.alta || coberturaNotifyTargets.baja;
    }
    return (
      canNotify &&
      affectedMembers.some(
        (a) => selectionById[a.member.id] && a.member?.mail,
      )
    );
  }, [
    isEditCobertura,
    isGroupChange,
    canNotify,
    affectedMembers,
    selectionById,
    coberturaNotifyTargets,
  ]);

  const selectedCoberturaLabel = useMemo(() => {
    if (selectedCoberturaPerson) {
      return personLabelWithInstr(selectedCoberturaPerson);
    }
    if (coberturaId && musician?.cobertura_label) {
      return String(musician.cobertura_label);
    }
    if (externoSoloNombre && coberturaNombre.trim()) {
      return coberturaNombre.trim();
    }
    return "";
  }, [
    selectedCoberturaPerson,
    coberturaId,
    musician?.cobertura_label,
    externoSoloNombre,
    coberturaNombre,
  ]);

  const coberturaCandidates = useMemo(() => {
    const q = fold(coberturaQuery.trim());
    const selfKey = integranteKey(musician?.id);
    const wantEstable = coberturaMode === "integrante";
    // Solo quien NO está en la gira (ni presente, ni ausente, ni cobertura actual).
    // La persona que ya cubre se ve en el chip «Quien cubre», no como opción de la lista.
    return (coberturaPeople || []).filter((p) => {
      const key = integranteKey(p.id);
      if (!key || key === selfKey) return false;
      if (rosterKeySet.has(key)) return false;
      if (isCondicionEstable(p) !== wantEstable) return false;
      if (!q) return true;
      const label = fold(personLabelWithInstr(p));
      return label.includes(q);
    });
  }, [
    coberturaPeople,
    coberturaQuery,
    rosterKeySet,
    musician?.id,
    coberturaMode,
  ]);

  const coberturaValid =
    ausenciaAbono !== "cobertura" ||
    Boolean(coberturaId) ||
    (coberturaMode === "externo" &&
      externoSoloNombre &&
      coberturaNombre.trim().length > 0);

  if (!pendingBaja || (!musician && !isGroupChange)) return null;
  if (isGroupChange && affectedMembers.length === 0) return null;

  const causeLabels = [
    ...new Set(affectedMembers.map((r) => r.causeLabel).filter(Boolean)),
  ];
  const hasFamilia = affectedMembers.some(
    (a) => a.causeKind === "familia" || a.causeKind === "mixto",
  );
  const hasEnsamble = affectedMembers.some(
    (a) => a.causeKind === "ensamble" || a.causeKind === "mixto",
  );

  const nombre = isGroupChange
    ? `${selectedCount} de ${affectedMembers.length} integrante(s)`
    : musician.nombre_completo || seatingApellidoNombre(musician);

  const isDesconvocar = action === "desconvocar";
  const isPresente = action === "presente";
  const motivoText = resolveBajaMotivoText(selectedMotivo, otroText);
  const motivoValid =
    isEditCobertura ||
    isGroupAlta ||
    isPresente ||
    (selectedMotivo && (selectedMotivo !== "otro" || motivoText.length > 0));
  const formValid = motivoValid && coberturaValid;

  const title = isEditCobertura
    ? "Opción de ausencia"
    : isPresente
      ? "Marcar como presente"
      : isGroupAlta
        ? hasFamilia && !hasEnsamble
          ? "Inclusión de familia"
          : hasEnsamble && !hasFamilia
            ? "Inclusión de ensamble"
            : "Inclusión grupal"
        : isGroupBaja
          ? hasFamilia && !hasEnsamble
            ? "Exclusión de familia"
            : hasEnsamble && !hasFamilia
              ? "Exclusión de ensamble"
              : "Cambio de convocatoria grupal"
          : isDesconvocar
            ? "Desconvocar de la gira"
            : "Marcar como ausente";

  const currentCoberturaLabel = coberturaLabelFromMusician(musician);
  const subtitle = isEditCobertura
    ? currentCoberturaLabel
      ? `Cobertura actual: ${currentCoberturaLabel}. Podés cambiar a R, L, otra cobertura o ninguna.`
      : musician?.abona_reemplazo
        ? "Hoy abona reemplazo (R). Podés cambiar la opción."
        : musician?.abona_licencia
          ? "Hoy está en licencia (L). Podés cambiar la opción."
          : "Elegí Ninguna, Reemplazo (R), Licencia (L) o Cobertura (C)."
    : isPresente
      ? "Confirmá el paso de ausente a presente en la nómina activa de la gira."
      : isGroupAlta
        ? `Por inclusión de: ${causeLabels.join(", ") || "familia"}. Las personas marcadas recibirán notificación de convocatoria; las destildadas entrarán al roster sin mail.`
        : isGroupBaja
          ? `Por exclusión de: ${causeLabels.join(", ") || "fuente grupal"}. Las personas marcadas se desconvocarán; las destildadas quedarán como convocatoria manual sin notificación.`
          : isDesconvocar
            ? "Indicá el motivo de la desconvocatoria."
            : "Indicá el motivo de la baja.";

  const toggleSelection = (memberId) => {
    setSelectionById((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
    setConfirmSkipNotify(false);
  };

  const handleConfirm = async (notify) => {
    if (!isEditor || !formValid || submitting) return;
    setSubmitting(true);
    try {
      const coberturaPayload =
        !isGroupChange && ausenciaAbono === "cobertura"
          ? coberturaId
            ? { idIntegrante: Number(coberturaId), nombre: "" }
            : {
                idIntegrante: null,
                nombre: coberturaNombre.trim(),
              }
          : isEditCobertura && ausenciaAbono === "ninguno"
            ? { clear: true }
            : null;
      await onConfirm({
        motivoText: isGroupAlta || isEditCobertura ? "" : motivoText,
        motivoId: isGroupAlta || isEditCobertura ? "" : selectedMotivo,
        notify,
        abonaReemplazo: !isGroupChange && ausenciaAbono === "reemplazo",
        abonaLicencia: !isGroupChange && ausenciaAbono === "licencia",
        cobertura: coberturaPayload,
        selectionById: isGroupChange ? selectionById : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const notifyEnabled = isGroupChange || isEditCobertura
    ? effectiveCanNotify
    : canNotify || effectiveCanNotify;
  const headerClass =
    isGroupAlta || isPresente
      ? "bg-emerald-50/80"
      : isEditCobertura
        ? "bg-emerald-50/80"
        : "bg-red-50/80";
  const confirmBtnClass =
    isGroupAlta || isPresente || isEditCobertura
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-red-600 hover:bg-red-700";

  const showAusenciaOptions = (!isGroupChange && !isPresente) || isEditCobertura;

  const openQuickCreate = () => {
    setCreateSeed(seedNameFromQuery(coberturaQuery));
    setShowCreatePerson(true);
  };

  const handleCreatedPerson = (created) => {
    if (!created?.id) return;
    const enriched = {
      ...created,
      instrumentos:
        created.instrumentos ||
        (created.id_instr
          ? { instrumento: created.instrumento || "" }
          : null),
    };
    setCoberturaPeople((prev) => {
      const exists = prev.some((p) => String(p.id) === String(created.id));
      if (exists) {
        return prev.map((p) =>
          String(p.id) === String(created.id) ? { ...p, ...enriched } : p,
        );
      }
      return [enriched, ...prev];
    });
    setCoberturaMode(isCondicionEstable(enriched) ? "integrante" : "externo");
    setCoberturaId(String(created.id));
    setCoberturaNombre("");
    setExternoSoloNombre(false);
    setShowCreatePerson(false);
    setCoberturaQuery("");
  };

  const coberturaPicker =
    ausenciaAbono === "cobertura" ? (
      <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: "integrante", label: "Integrante", hint: "Estables" },
            { id: "externo", label: "Externo", hint: "No estables" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const nextIsEstable = opt.id === "integrante";
                const selected = selectedCoberturaPerson;
                const keep =
                  selected &&
                  isCondicionEstable(selected) === nextIsEstable;
                setCoberturaMode(opt.id);
                if (!keep) {
                  setCoberturaId("");
                  setCoberturaNombre("");
                  setExternoSoloNombre(false);
                }
                setCoberturaQuery("");
              }}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                coberturaMode === opt.id
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title={opt.hint}
            >
              {opt.label}
            </button>
          ))}
          {coberturaMode === "externo" && (
            <button
              type="button"
              onClick={openQuickCreate}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              <IconPlus size={12} />
              Crear persona
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-500 leading-snug">
          {coberturaMode === "integrante"
            ? "Estables que no estén ya en esta gira. Al cambiar, elegí a otra persona de la lista."
            : "No estables fuera de esta gira. Podés crear ficha, usar solo un nombre o cambiar la elección."}
        </p>

        {selectedCoberturaLabel && !externoSoloNombre && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Quien cubre
              </p>
              <p
                className="text-sm font-medium text-slate-800 truncate"
                title={selectedCoberturaLabel}
              >
                {selectedCoberturaLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCoberturaId("");
                setCoberturaNombre("");
                setExternoSoloNombre(false);
                setCoberturaQuery("");
              }}
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              Cambiar
            </button>
          </div>
        )}

        {coberturaMode === "externo" && externoSoloNombre ? (
          <div className="space-y-2">
            <input
              type="text"
              value={coberturaNombre}
              onChange={(e) => {
                setCoberturaNombre(e.target.value);
                setCoberturaId("");
              }}
              placeholder="Nombre de quien cubre (sin ficha)…"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setExternoSoloNombre(false);
                setCoberturaNombre("");
              }}
              className="text-[11px] font-semibold text-emerald-800 hover:underline"
            >
              Elegir del padrón o crear persona
            </button>
          </div>
        ) : (
          <>
            <input
              type="search"
              value={coberturaQuery}
              onChange={(e) => setCoberturaQuery(e.target.value)}
              placeholder="Buscar para cambiar o elegir…"
              className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-300 outline-none"
            />
            <div className="rounded-xl border border-slate-200 bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
              {coberturaLoading ? (
                <p className="text-[11px] text-slate-400 px-3 py-2">Cargando…</p>
              ) : coberturaCandidates.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-3 py-2">
                  {coberturaMode === "integrante"
                    ? "Ningún estable fuera de esta gira."
                    : "Nadie fuera de esta gira. Creá una persona o usá solo un nombre."}
                </p>
              ) : (
                coberturaCandidates.slice(0, 50).map((p) => {
                  const selected = String(coberturaId) === String(p.id);
                  const label = personLabelWithInstr(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCoberturaId(String(p.id));
                        setCoberturaNombre("");
                        setExternoSoloNombre(false);
                      }}
                      className={`w-full text-left px-3 py-2 transition-colors ${
                        selected ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-800 block truncate">
                        {label}
                        {selected ? (
                          <span className="ml-1.5 text-[10px] font-semibold text-emerald-700">
                            · actual
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {coberturaMode === "externo" && (
              <button
                type="button"
                onClick={() => {
                  setExternoSoloNombre(true);
                  setCoberturaId("");
                  setCoberturaNombre(coberturaQuery.trim());
                }}
                className="text-[11px] font-semibold text-slate-600 hover:underline"
              >
                Usar solo un nombre (sin ficha)
              </button>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <>
    {createPortal(
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[120]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-baja-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        <div
          className={`flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 shrink-0 ${headerClass}`}
        >
          <div className="min-w-0">
            <h2
              id="roster-baja-title"
              className="text-sm font-bold text-slate-800"
            >
              {title}
            </h2>
            <p className="text-xs text-slate-600 truncate mt-0.5" title={nombre}>
              {nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-slate-500 hover:bg-white/80 hover:text-slate-800 transition-colors shrink-0 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          <p className="text-[11px] text-slate-500 leading-snug">{subtitle}</p>

          {isGroupChange && (
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  {isGroupAlta
                    ? `Se notificará a ${selectedCount} persona${selectedCount === 1 ? "" : "s"}`
                    : `Se desconvocará a ${selectedCount} persona${selectedCount === 1 ? "" : "s"}`}
                </p>
                {manualAffectedCount > 0 && (
                  <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                    {manualAffectedCount === 1
                      ? `Hay 1 persona convocada manualmente: ${isGroupAlta ? "no se notificará" : "no se desconvocará"} salvo que actives su casilla.`
                      : `Hay ${manualAffectedCount} personas convocadas manualmente: ${isGroupAlta ? "no se notificarán" : "no se desconvocarán"} salvo que actives su casilla.`}
                  </p>
                )}
              </div>

              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {affectedMembers.map((a) => {
                  const m = a.member;
                  const checked = Boolean(selectionById[m.id]);
                  const label =
                    m.nombre_completo || seatingApellidoNombre(m);
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                          checked
                            ? isGroupAlta
                              ? "bg-emerald-50/50"
                              : "bg-red-50/50"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(m.id)}
                          className={`rounded border-slate-300 shrink-0 ${isGroupAlta ? "text-emerald-600 focus:ring-emerald-400" : "text-red-600 focus:ring-red-400"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-slate-800 block truncate">
                            {label}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {m.instrumentos?.instrumento || "—"}
                            {a.causeLabel && (
                              <span className="ml-1.5 text-slate-600">
                                · {a.causeLabel}
                              </span>
                            )}
                            {a.isAlreadyManual && (
                              <span className="ml-1.5 text-amber-700 font-semibold">
                                · Convocado manualmente
                              </span>
                            )}
                            {!checked && !a.isAlreadyManual && isGroupBaja && (
                              <span className="ml-1.5 text-fixed-indigo-700 font-semibold">
                                · Quedará como manual
                              </span>
                            )}
                            {!checked && !a.isAlreadyManual && isGroupAlta && (
                              <span className="ml-1.5 text-slate-600 font-semibold">
                                · Sin notificación
                              </span>
                            )}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {isGroupBaja && (
            <>
              <fieldset className="space-y-2">
                <legend className="sr-only">Motivo de la baja</legend>
                {BAJA_MOTIVO_OPCIONES.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedMotivo === opt.id
                        ? "border-red-300 bg-red-50/60"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="baja-motivo"
                      value={opt.id}
                      checked={selectedMotivo === opt.id}
                      onChange={() => {
                        setSelectedMotivo(opt.id);
                        setConfirmSkipNotify(false);
                      }}
                      className="mt-0.5 text-red-600 focus:ring-red-400"
                    />
                    <span className="text-sm text-slate-800 font-medium">
                      {opt.label}
                      {opt.id === "otro" ? ":" : ""}
                    </span>
                  </label>
                ))}
              </fieldset>

              {selectedMotivo === "otro" && (
                <input
                  type="text"
                  value={otroText}
                  onChange={(e) => setOtroText(e.target.value)}
                  placeholder="Especificá el motivo…"
                  className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-red-400/30 focus:border-red-300 outline-none"
                />
              )}
            </>
          )}

          {!isGroupChange && !isPresente && !isEditCobertura && (
            <>
              <fieldset
                className={`space-y-2 rounded-xl p-0.5 ${
                  !motivoValid ? "ring-2 ring-amber-300/80 ring-offset-2" : ""
                }`}
              >
                <legend className="text-xs font-semibold text-slate-600 mb-1 px-0.5">
                  Motivo de la baja
                </legend>
                {BAJA_MOTIVO_OPCIONES.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedMotivo === opt.id
                        ? "border-red-300 bg-red-50/60"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="baja-motivo"
                      value={opt.id}
                      checked={selectedMotivo === opt.id}
                      onChange={() => {
                        setSelectedMotivo(opt.id);
                        setConfirmSkipNotify(false);
                      }}
                      className="mt-0.5 text-red-600 focus:ring-red-400"
                    />
                    <span className="text-sm text-slate-800 font-medium">
                      {opt.label}
                      {opt.id === "otro" ? ":" : ""}
                    </span>
                  </label>
                ))}
              </fieldset>

              {selectedMotivo === "otro" && (
                <input
                  type="text"
                  value={otroText}
                  onChange={(e) => setOtroText(e.target.value)}
                  placeholder="Especificá el motivo…"
                  className="w-full text-sm rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-red-400/30 focus:border-red-300 outline-none"
                  autoFocus
                />
              )}
            </>
          )}

          {showAusenciaOptions && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-slate-600 mb-1">
                {isEditCobertura
                  ? "Opción de ausencia"
                  : "Opción de ausencia (cuenta servicio)"}
              </legend>
              {[
                {
                  id: "ninguno",
                  label: "Ninguna",
                  hint: isEditCobertura
                    ? "Sin R, L ni C: no suma servicio."
                    : "No suma en Convocatorias ni en el resumen anual.",
                  border: "border-slate-200 hover:border-slate-300",
                  bg: "bg-slate-50/50",
                  labelClass: "text-slate-800",
                },
                {
                  id: "reemplazo",
                  label: "Abona reemplazo (R)",
                  hint: "Cuenta como servicio en resumen anual y Convocatorias.",
                  border: "border-sky-200 hover:border-sky-300",
                  bg: "bg-sky-50/50",
                  labelClass: "text-sky-800",
                },
                {
                  id: "licencia",
                  label: "Licencia (L)",
                  hint: "Cuenta como servicio; no asiste a la gira.",
                  border: "border-amber-200 hover:border-amber-300",
                  bg: "bg-amber-50/50",
                  labelClass: "text-amber-900",
                },
                {
                  id: "cobertura",
                  label: "Cobertura (C)",
                  hint: "Cuenta para el ausente; quien cubre no suma. Sin abonar.",
                  border: "border-emerald-200 hover:border-emerald-300",
                  bg: "bg-emerald-50/50",
                  labelClass: "text-emerald-800",
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${opt.border} ${opt.bg}`}
                >
                  <input
                    type="radio"
                    name="ausencia-abono"
                    checked={ausenciaAbono === opt.id}
                    onChange={() => setAusenciaAbono(opt.id)}
                    className="mt-0.5 text-slate-600 focus:ring-slate-400"
                  />
                  <span className="text-sm text-slate-800">
                    <span className={`font-semibold ${opt.labelClass}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {showAusenciaOptions && coberturaPicker}

          {!formValid && !isPresente && !isGroupAlta && !confirmSkipNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2 text-amber-900">
              <IconAlertTriangle size={14} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium leading-snug">
                {!motivoValid
                  ? isDesconvocar
                    ? "Elegí el motivo de la desconvocatoria para confirmar."
                    : "Elegí el motivo de la baja para confirmar."
                  : ausenciaAbono === "cobertura" &&
                      coberturaMode === "externo" &&
                      externoSoloNombre
                    ? "Escribí el nombre de quien cubre."
                    : "Elegí quién cubre (estable, externo o crear persona)."}
              </p>
            </div>
          )}

          {confirmSkipNotify && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-900">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs font-medium leading-snug">
                  ¿Confirmás{" "}
                  {isEditCobertura
                    ? "el cambio de cobertura"
                    : isPresente
                      ? "marcar como presente"
                      : isGroupAlta
                        ? "la inclusión"
                        : isGroupBaja
                          ? "el cambio de convocatoria"
                          : isDesconvocar
                            ? "la desconvocatoria"
                            : "marcar como ausente"}{" "}
                  sin enviar mail
                  {isEditCobertura
                    ? coberturaNotifyTargets.alta && coberturaNotifyTargets.baja
                      ? " (alta al nuevo y baja al anterior)"
                      : coberturaNotifyTargets.alta
                        ? " de alta al que cubre"
                        : " de baja al que cubría"
                    : isGroupChange
                      ? " a los músicos"
                      : coberturaNotifyTargets.alta
                        ? " (ausente y/o alta de cobertura)"
                        : " al músico"}
                  ?
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSkipNotify(false)}
                  disabled={submitting}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-amber-100 transition-colors"
                >
                  No, volver
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
                  disabled={!formValid || submitting}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
                >
                  Sí, sin notificar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/80 transition-colors disabled:opacity-50"
          >
            Deshacer
          </button>
          {notifyEnabled && !confirmSkipNotify && (
            <button
              type="button"
              onClick={() => setConfirmSkipNotify(true)}
              disabled={!formValid || submitting}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 transition-colors disabled:opacity-50"
            >
              Confirmar sin notificar
            </button>
          )}
          <button
            type="button"
            onClick={() => handleConfirm(notifyEnabled)}
            disabled={!formValid || submitting || confirmSkipNotify}
            className={`text-xs font-bold px-4 py-2 rounded-lg text-white shadow-sm disabled:opacity-50 transition-colors ${confirmBtnClass}`}
          >
            {submitting
              ? "Guardando…"
              : notifyEnabled
                ? "Confirmar y notificar"
                : "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )}
    {showCreatePerson &&
      createPortal(
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[130]"
          role="dialog"
          aria-modal="true"
          aria-label="Crear persona para cobertura"
        >
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <MusicianForm
              supabase={supabase}
              musician={{
                nombre: createSeed.nombre,
                apellido: createSeed.apellido,
                condicion: "Invitado",
              }}
              onSave={handleCreatedPerson}
              onCancel={() => setShowCreatePerson(false)}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
