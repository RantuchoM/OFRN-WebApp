import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RichTextPreview } from "../../components/repertoire/RepertoireWorkPickerModal";
import { IconChevronDown, IconChevronUp, IconTrash } from "../../components/ui/Icons";
import {
  SCALE_FOOT,
  SCALE_INTRO,
  SCORE_SCALE,
  WINDOW_COPY,
  boletaCompleta,
  borrarPuntaje,
  fetchBoleta,
  formatDateTimeAR,
  formatParticipanteNombres,
  guardarPuntaje,
  lineaPrincipalParticipante,
  participanteIncluye,
  tituloCortoObra,
  windowState,
} from "../../utils/concertoCompeticion";

function nombresDe(participante) {
  return formatParticipanteNombres(participante.integrantes) || "Sin nombre";
}

export function ParticipanteVotoIdentidad({ participante }) {
  const nombre = formatParticipanteNombres(participante?.integrantes) || "Sin nombre";
  const titulo = participante?.repertorio_obra?.obras?.titulo;
  const obs = String(participante?.observaciones || "").trim();
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-800">
        {nombre}
        {titulo ? " - " : ""}
        {titulo ? (
          <RichTextPreview content={titulo} className="font-normal [&_p]:my-0 [&_div]:my-0" />
        ) : null}
      </div>
      {obs ? <p className="text-xs text-slate-500">{obs}</p> : null}
    </div>
  );
}

function PuntajeControles({ participante, selected, onElegir, onQuitar }) {
  const label = lineaPrincipalParticipante(participante);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Puntaje de ${label}`}>
        {SCORE_SCALE.map((item) => {
          const active = mismoPuntaje(selected, item.value);
          return (
            <button
              key={item.value}
              type="button"
              title={item.descripcion}
              aria-pressed={active}
              onClick={() => onElegir(participante.id, item.value)}
              className={`min-w-[2.75rem] rounded-lg border px-2 py-1.5 text-sm font-semibold ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {selected != null ? (
        <button
          type="button"
          title="Borrar puntaje"
          aria-label={`Borrar puntaje de ${label}`}
          onClick={() => onQuitar(participante.id)}
          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
        >
          <IconTrash size={16} />
        </button>
      ) : null}
    </div>
  );
}

function BoletaFila({ participante, selected, onElegir, onQuitar }) {
  const [open, setOpen] = useState(false);
  const nombre = nombresDe(participante);
  const corto = tituloCortoObra(participante?.repertorio_obra?.obras?.titulo);
  const obs = String(participante?.observaciones || "").trim();
  return (
    <div>
      <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Detalle de ${nombre}`}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-medium text-slate-800">{nombre}</span>
            <span className="mt-0.5 block break-words text-sm text-slate-600">{corto || "—"}</span>
          </span>
          {open ? (
            <IconChevronUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
          ) : (
            <IconChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
          )}
        </button>
        {open ? (
          <div className="space-y-2 border-t border-slate-100 px-3 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Observaciones</p>
              <p className="mt-1 break-words text-sm text-slate-600">{obs || "—"}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Puntaje</p>
              <PuntajeControles
                participante={participante}
                selected={selected}
                onElegir={onElegir}
                onQuitar={onQuitar}
              />
            </div>
          </div>
        ) : null}
      </article>
      <div className="hidden gap-2 py-3 md:flex md:items-center md:justify-between">
        <ParticipanteVotoIdentidad participante={participante} />
        <PuntajeControles
          participante={participante}
          selected={selected}
          onElegir={onElegir}
          onQuitar={onQuitar}
        />
      </div>
    </div>
  );
}

function BoletaCardCerrada({ participante }) {
  const [open, setOpen] = useState(false);
  const nombre = nombresDe(participante);
  const corto = tituloCortoObra(participante?.repertorio_obra?.obras?.titulo);
  const obs = String(participante?.observaciones || "").trim();
  return (
    <li className="min-w-0 overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Detalle de ${nombre}`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-start gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium text-slate-800">{nombre}</span>
          <span className="mt-0.5 block break-words text-sm text-slate-600">{corto || "—"}</span>
        </span>
        {open ? (
          <IconChevronUp size={16} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <IconChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
        )}
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Observaciones</p>
          <p className="mt-1 break-words text-sm text-slate-600">{obs || "—"}</p>
        </div>
      ) : null}
    </li>
  );
}

function ListaCerrada({ instancia, estado }) {
  return (
    <div className="space-y-3">
      <ul className="hidden divide-y divide-slate-100 md:block">
        {instancia.participantes.map((participante) => (
          <li key={participante.id} className="py-2">
            <ParticipanteVotoIdentidad participante={participante} />
          </li>
        ))}
      </ul>
      <ul className="space-y-2 md:hidden">
        {instancia.participantes.map((participante) => (
          <BoletaCardCerrada key={participante.id} participante={participante} />
        ))}
      </ul>
      <p className="text-sm text-slate-600">{WINDOW_COPY[estado]}</p>
      {estado === "pending" && instancia.abre_en ? (
        <p className="text-xs text-slate-500">Abre el {formatDateTimeAR(instancia.abre_en)}.</p>
      ) : null}
      {estado === "closed" && instancia.cierra_en ? (
        <p className="text-xs text-slate-500">Cerró el {formatDateTimeAR(instancia.cierra_en)}.</p>
      ) : null}
    </div>
  );
}

function mismoPuntaje(left, right) {
  if (left == null || right == null) return false;
  return Math.abs(Number(left) - Number(right)) < 0.001;
}

function BoletaAbierta({ supabase, userId, instancia, onSaved }) {
  const votables = useMemo(
    () => instancia.participantes.filter((participante) => !participanteIncluye(participante, userId)),
    [instancia.participantes, userId],
  );
  const propios = useMemo(
    () => instancia.participantes.filter((participante) => participanteIncluye(participante, userId)),
    [instancia.participantes, userId],
  );
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState("");
  const confirmedRef = useRef({});
  const scoresRef = useRef({});
  const queueRef = useRef([]);
  const drainingRef = useRef(false);
  const drainErrorRef = useRef("");
  const toastId = `concerto-boleta-${instancia.id}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSynced(false);
    setSyncing(false);
    queueRef.current = [];
    fetchBoleta(supabase, userId, instancia.id).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      const next = result.scores || {};
      confirmedRef.current = { ...next };
      scoresRef.current = next;
      setScores(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, instancia.id]);

  const complete = boletaCompleta(votables, scores);

  const revertir = (key, failedValue) => {
    setScores((prev) => {
      if (!mismoPuntaje(prev[key], failedValue)) return prev;
      const confirmed = confirmedRef.current[key];
      const next = { ...prev };
      if (confirmed == null) delete next[key];
      else next[key] = confirmed;
      scoresRef.current = next;
      return next;
    });
  };

  const drain = async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setSyncing(true);
    setSynced(false);
    toast.loading("Sincronizando…", { id: toastId });
    try {
      while (queueRef.current.length) {
        const batch = queueRef.current.splice(0, queueRef.current.length);
        const latest = new Map();
        for (const job of batch) latest.set(job.key, job);
        for (const job of latest.values()) {
          let result;
          try {
            result = job.remove
              ? await borrarPuntaje(supabase, userId, instancia.id, job.id)
              : await guardarPuntaje(supabase, userId, instancia.id, job.id, job.value);
          } catch (err) {
            result = { error: err?.message || "No se pudo sincronizar el puntaje." };
          }
          const sigue =
            job.remove
              ? scoresRef.current[job.key] == null
              : mismoPuntaje(scoresRef.current[job.key], job.value);
          if (!sigue) continue;
          if (result.error) {
            drainErrorRef.current = result.error;
            if (job.remove) {
              const confirmed = confirmedRef.current[job.key];
              setScores((prev) => {
                if (prev[job.key] != null || confirmed == null) return prev;
                const restored = { ...prev, [job.key]: confirmed };
                scoresRef.current = restored;
                return restored;
              });
            } else {
              revertir(job.key, job.value);
            }
            continue;
          }
          if (job.remove) {
            const nextConfirmed = { ...confirmedRef.current };
            delete nextConfirmed[job.key];
            confirmedRef.current = nextConfirmed;
          } else {
            confirmedRef.current = { ...confirmedRef.current, [job.key]: job.value };
          }
        }
      }
    } finally {
      drainingRef.current = false;
    }
    if (queueRef.current.length) {
      await drain();
      return;
    }
    setSyncing(false);
    if (drainErrorRef.current) {
      setError(drainErrorRef.current);
      setSynced(false);
      toast.error(drainErrorRef.current, { id: toastId });
      return;
    }
    setError("");
    setSynced(true);
    toast.success("Puntaje sincronizado", { id: toastId });
    onSaved?.();
  };

  const elegir = (participanteId, value) => {
    if (loading) return;
    const key = String(participanteId);
    const next = { ...scoresRef.current, [key]: value };
    scoresRef.current = next;
    setScores(next);
    setError("");
    setSynced(false);
    drainErrorRef.current = "";
    queueRef.current.push({ id: participanteId, key, value });
    setSyncing(true);
    drain();
  };

  const quitarPuntaje = (participanteId) => {
    if (loading) return;
    const key = String(participanteId);
    const previous = scoresRef.current[key];
    if (previous == null) return;
    const next = { ...scoresRef.current };
    delete next[key];
    scoresRef.current = next;
    setScores(next);
    setError("");
    setSynced(false);
    drainErrorRef.current = "";
    queueRef.current.push({ id: participanteId, key, remove: true, previous });
    setSyncing(true);
    drain();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm text-slate-600">
        {SCALE_INTRO.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <dl className="space-y-1">
          {SCORE_SCALE.map((item) => (
            <div key={item.value} className="grid grid-cols-[3.25rem_1fr] gap-2">
              <dt className="font-semibold text-slate-800">{item.label}</dt>
              <dd>{item.descripcion}</dd>
            </div>
          ))}
        </dl>
        <p>{SCALE_FOOT}</p>
      </div>

      {propios.length > 0 ? (
        <p className="text-sm text-slate-500">
          No puntuás: {propios.map(nombresDe).join("; ")}.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando boleta…</p>
      ) : votables.length === 0 ? (
        <p className="text-sm text-slate-500">No hay otros participantes para puntuar.</p>
      ) : (
        <div className="space-y-2 md:space-y-0 md:divide-y md:divide-slate-100">
          {votables.map((participante) => (
            <BoletaFila
              key={participante.id}
              participante={participante}
              selected={scores[String(participante.id)]}
              onElegir={elegir}
              onQuitar={quitarPuntaje}
            />
          ))}
        </div>
      )}

      {syncing ? (
        <p className="text-sm font-medium text-indigo-700" role="status">
          Sincronizando…
        </p>
      ) : null}
      {synced && !syncing && !error ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          Sincronizado.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && votables.length > 0 && !complete ? (
        <p className="text-sm text-slate-500">
          El promedio cuenta esta boleta cuando puntuás a todos los demás.
        </p>
      ) : null}
      {!loading && complete && !syncing && !error ? (
        <p className="text-sm text-slate-600">Boleta completa: entra al promedio.</p>
      ) : null}
    </div>
  );
}

export default function ConcertoBallot({ supabase, userId, instancia, now, onSaved }) {
  const estado = windowState(instancia, now);
  if (estado !== "open") {
    return <ListaCerrada instancia={instancia} estado={estado} />;
  }
  return (
    <BoletaAbierta
      supabase={supabase}
      userId={userId}
      instancia={instancia}
      onSaved={onSaved}
    />
  );
}
