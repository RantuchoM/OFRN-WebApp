import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DateInput from "../../components/ui/DateInput";
import { BajaDateField, BajaDateModal } from "../../components/ui/BajaDateControls";
import {
  IconClock,
  IconEdit,
  IconLoader,
  IconPlus,
} from "../../components/ui/Icons";
import { useMusicianFormContext } from "./MusicianFormContext";
import NovedadModal from "./NovedadModal";
import { toIsoDateString } from "../../utils/ensembleMembership";
import { HORAS_MESES } from "../../utils/horasNominaReport";
import {
  insertBajaHorasNovedadesZero,
  nextMonthFromIso,
} from "../../utils/horasBajaFromFicha";

const HORAS_CONCEPTOS = [
  { id: "h_basico", label: "Básico" },
  { id: "h_ensayos", label: "Ensayos" },
  { id: "h_ensamble", label: "Ensamble" },
  { id: "h_categoria", label: "Categoría" },
  { id: "h_coordinacion", label: "Coord." },
  { id: "h_desarraigo", label: "Desarraigo" },
  { id: "h_otros", label: "Otros" },
];

const HORAS_ORIGENES = ["CULTURA", "EDUCACION"];

function rowTotalHoras(record) {
  return HORAS_CONCEPTOS.reduce((acc, c) => acc + (Number(record?.[c.id]) || 0), 0);
}

function latestByOrigen(history, origen) {
  const rows = (history || []).filter((r) => r.origen === origen);
  if (!rows.length) return null;
  return rows.reduce((best, r) => {
    const score = Number(r.anio_inicio) * 100 + Number(r.mes_inicio);
    const bestScore = best ? Number(best.anio_inicio) * 100 + Number(best.mes_inicio) : -1;
    return score >= bestScore ? r : best;
  }, null);
}

/** Pestaña "Legajo": cargo, fechas alta/baja, horas cátedra (novedades/historial) y links. */
export default function MusicianDocsSection() {
  const {
    formData,
    updateField,
    ensembleMembershipRows,
    handleCloseOpenMemberships,
    getInputStatusClass,
    labelClass,
    inputClass,
    supabase,
  } = useMusicianFormContext();
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [bajaBusy, setBajaBusy] = useState(false);
  const [closeEnsembles, setCloseEnsembles] = useState(true);
  const [syncHorasZero, setSyncHorasZero] = useState(true);
  const [novedadMes, setNovedadMes] = useState(() => nextMonthFromIso("").month);
  const [novedadAnio, setNovedadAnio] = useState(() => nextMonthFromIso("").year);

  const [horasHistory, setHorasHistory] = useState([]);
  const [horasLoading, setHorasLoading] = useState(false);
  const [novedadOpen, setNovedadOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  const openMembershipCount = (ensembleMembershipRows || []).filter(
    (row) => row.fecha_hasta == null || row.fecha_hasta === "",
  ).length;

  const musicianLabel = [formData.apellido, formData.nombre]
    .filter(Boolean)
    .join(", ");

  const musicianForHoras = useMemo(
    () =>
      formData.id
        ? {
            id: formData.id,
            apellido: formData.apellido,
            nombre: formData.nombre,
            condicion: formData.condicion,
            dni: formData.dni,
          }
        : null,
    [formData.id, formData.apellido, formData.nombre, formData.condicion, formData.dni],
  );

  const fetchHorasHistory = useCallback(async () => {
    if (!formData.id || !supabase) {
      setHorasHistory([]);
      return;
    }
    setHorasLoading(true);
    try {
      const { data, error } = await supabase
        .from("horas_catedra")
        .select("*")
        .eq("id_integrante", formData.id)
        .order("anio_inicio", { ascending: false })
        .order("mes_inicio", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHorasHistory(data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cargar el historial de horas.");
      setHorasHistory([]);
    } finally {
      setHorasLoading(false);
    }
  }, [formData.id, supabase]);

  useEffect(() => {
    fetchHorasHistory();
  }, [fetchHorasHistory]);

  const vigentes = useMemo(() => {
    const out = {};
    for (const org of HORAS_ORIGENES) {
      const latest = latestByOrigen(horasHistory, org);
      out[org] = latest ? rowTotalHoras(latest) : 0;
    }
    return out;
  }, [horasHistory]);

  const applyFechaBaja = (iso) => {
    const alta = toIsoDateString(formData.fecha_alta);
    if (iso != null && alta && iso < alta) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return false;
    }
    updateField("fecha_baja", iso || "");
    return true;
  };

  const handleEffectiveBajaDate = (iso) => {
    const next = nextMonthFromIso(iso);
    setNovedadMes(next.month);
    setNovedadAnio(next.year);
  };

  const confirmBaja = async (fecha) => {
    if (!fecha) return;
    const alta = toIsoDateString(formData.fecha_alta);
    if (alta && fecha < alta) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de alta.");
      return;
    }

    setBajaBusy(true);
    try {
      if (closeEnsembles) {
        const membershipsClosed = await handleCloseOpenMemberships(fecha);
        if (!membershipsClosed) return;
      }
      if (!applyFechaBaja(fecha)) return;

      if (syncHorasZero) {
        if (!formData.id) {
          toast.message(
            "Fecha de baja cargada. Guardá la ficha antes de poder sincronizar horas cátedra.",
            { duration: 5000 },
          );
        } else {
          try {
            const result = await insertBajaHorasNovedadesZero({
              supabase,
              idIntegrante: formData.id,
              year: novedadAnio,
              month: novedadMes,
            });
            if (result.inserted > 0) {
              toast.success(
                `Horas en 0: ${result.inserted} novedad${result.inserted === 1 ? "" : "es"} (${result.origenes.join(", ")}) desde ${novedadMes}/${novedadAnio}.`,
              );
              fetchHorasHistory();
            } else {
              toast.message(
                "Sin horas vigentes que poner en 0; no se creó novedad.",
              );
            }
          } catch (err) {
            toast.error(
              err?.message ||
                "Fecha de baja cargada, pero no se pudieron crear las novedades de horas.",
            );
          }
        }
      }

      setBajaModalOpen(false);
    } finally {
      setBajaBusy(false);
    }
  };

  const openNuevaNovedad = () => {
    setRecordToEdit(null);
    setNovedadOpen(true);
  };

  const openEditarRegistro = (record) => {
    setRecordToEdit(record);
    setNovedadOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <BajaDateModal
        isOpen={bajaModalOpen}
        subjectLabel={musicianLabel || undefined}
        description="Elegí la fecha de baja del integrante:"
        busy={bajaBusy}
        onClose={() => setBajaModalOpen(false)}
        onConfirm={confirmBaja}
        onEffectiveDateChange={handleEffectiveBajaDate}
      >
        {openMembershipCount > 0 ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <input
              type="checkbox"
              checked={closeEnsembles}
              onChange={(event) => setCloseEnsembles(event.target.checked)}
              disabled={bajaBusy}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              Dar de baja también sus{" "}
              <strong>
                {openMembershipCount}{" "}
                {openMembershipCount === 1 ? "ensamble asociado" : "ensambles asociados"}
              </strong>{" "}
              con la misma fecha.
            </span>
          </label>
        ) : null}

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={syncHorasZero}
              onChange={(event) => setSyncHorasZero(event.target.checked)}
              disabled={bajaBusy}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-700">
              Poner horas cátedra en <strong>0</strong> (novedad automática por
              cada origen con horas).
            </span>
          </label>
          {syncHorasZero ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/70 mb-1.5">
                Mes de vigencia de la novedad
              </p>
              <div className="flex gap-2">
                <select
                  value={novedadMes}
                  onChange={(e) => setNovedadMes(Number(e.target.value))}
                  disabled={bajaBusy}
                  className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-800 disabled:opacity-60"
                >
                  {HORAS_MESES.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={novedadAnio}
                  onChange={(e) => setNovedadAnio(Number(e.target.value) || novedadAnio)}
                  disabled={bajaBusy}
                  className="w-24 border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white text-slate-800 disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-amber-900/60 mt-1.5 leading-snug">
                Por defecto, el mes siguiente a la fecha de baja. Podés cambiarlo.
              </p>
            </div>
          ) : null}
        </div>
      </BajaDateModal>

      {musicianForHoras && (
        <NovedadModal
          isOpen={novedadOpen}
          onClose={() => {
            setNovedadOpen(false);
            setRecordToEdit(null);
          }}
          supabase={supabase}
          musician={musicianForHoras}
          allMusicians={[musicianForHoras]}
          recordToEdit={recordToEdit}
          onSuccess={() => {
            fetchHorasHistory();
          }}
        />
      )}

      {/* Enlaces */}
      <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Enlaces
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Bio (Drive/Web)</label>
            <input
              type="text"
              className={inputClass}
              value={formData.link_bio || ""}
              onChange={(e) => updateField("link_bio", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Foto Perfil (Popup)</label>
            <input
              type="text"
              className={inputClass}
              value={formData.link_foto_popup || ""}
              onChange={(e) => updateField("link_foto_popup", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Situación laboral */}
      <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-5">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Situación laboral
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Cargo</label>
            <input
              type="text"
              className={getInputStatusClass("cargo")}
              value={formData.cargo || ""}
              onChange={(e) => updateField("cargo", e.target.value)}
              placeholder="Ej: Agente administrativo"
            />
          </div>
          <div>
            <label className={labelClass}>Jornada</label>
            <input
              type="text"
              className={getInputStatusClass("jornada")}
              value={formData.jornada || ""}
              onChange={(e) => updateField("jornada", e.target.value)}
              placeholder="Ej: Horas cátedra"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <DateInput
              label="Fecha Alta"
              value={formData.fecha_alta || ""}
              onChange={(val) => updateField("fecha_alta", val)}
            />
          </div>
          <div>
            <BajaDateField
              label="Fecha Baja"
              value={formData.fecha_baja || null}
              wrapperClassName="w-full"
              onOpenBajaModal={() => {
                setCloseEnsembles(true);
                setSyncHorasZero(true);
                setBajaModalOpen(true);
              }}
              onChange={(iso) => applyFechaBaja(iso)}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Motivo</label>
          <input
            type="text"
            className={getInputStatusClass("motivo")}
            value={formData.motivo || ""}
            onChange={(e) => updateField("motivo", e.target.value)}
            placeholder="Si necesita un motivo personalizado"
          />
        </div>
      </section>

      {/* Horas cátedra */}
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
              <IconClock size={12} /> Horas cátedra
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Cargá novedades o editá el historial desde acá. Para dar de baja horas usá una novedad en 0 hs.
            </p>
          </div>
          {formData.id ? (
            <button
              type="button"
              onClick={openNuevaNovedad}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all"
            >
              <IconPlus size={14} /> Cargar novedad
            </button>
          ) : null}
        </div>

        {!formData.id ? (
          <p className="text-sm text-slate-400 italic py-2">
            Guardá la ficha para gestionar horas cátedra.
          </p>
        ) : horasLoading ? (
          <div className="flex justify-center py-8">
            <IconLoader className="animate-spin text-slate-400" size={22} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {HORAS_ORIGENES.map((org) => (
                <div
                  key={org}
                  className={`rounded-xl border bg-white px-3 py-2.5 ${
                    org === "CULTURA"
                      ? "border-orange-200 text-orange-800"
                      : "border-blue-200 text-blue-800"
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
                    {org}
                  </div>
                  <div className="text-lg font-black tabular-nums">
                    {vigentes[org]} hs
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Historial
                </h5>
                {horasHistory.length > 0 ? (
                  <button
                    type="button"
                    onClick={openNuevaNovedad}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide"
                  >
                    Nueva / modificar
                  </button>
                ) : null}
              </div>

              {horasHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center rounded-xl border border-dashed border-slate-200 bg-white/60">
                  Sin registros. Usá «Cargar novedad» para el primer alta.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 rounded-xl border border-slate-100 bg-white p-3">
                  {horasHistory.map((item) => {
                    const total = rowTotalHoras(item);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-slate-700">
                              {item.mes_inicio}/{item.anio_inicio}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                item.origen === "CULTURA"
                                  ? "text-orange-700 bg-orange-50"
                                  : "text-blue-700 bg-blue-50"
                              }`}
                            >
                              {item.origen}
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {total} hs
                            </span>
                          </div>
                          {item.observaciones ? (
                            <p className="text-[10px] text-slate-400 italic truncate">
                              {item.observaciones}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditarRegistro(item)}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Editar registro"
                        >
                          <IconEdit size={12} /> Editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
