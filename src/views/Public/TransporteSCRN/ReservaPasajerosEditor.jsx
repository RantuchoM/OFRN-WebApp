import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../services/supabase";
import { ensureScrnPerfilForNewEmail } from "../../../services/scrnCreatePerfil";
import AlertModal from "../../../components/ui/AlertModal";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import {
  paxEmailMostrar,
  paxNombreCompleto,
  rowReservaPaxDesdePerfil,
} from "./scrnReservaPaxUtils";

/**
 * Altas en scrn_reserva_pasajeros para una reserva (personas además de quien inscribe).
 * RLS: solicitante (dueño de la reserva) o admin.
 */
export default function ReservaPasajerosEditor({
  reserva,
  allProfiles = [],
  excludedProfileIds = [],
  onReload,
  disabled = false,
  readOnly = false,
  /** Menos márgenes y tipografía pequeña (p. ej. bajo tablas) */
  compact = false,
  /** Dibujado en la segunda fila de la grilla: sin título duplicado, más aire para “ficha” */
  tableRow = false,
  /** Solo formularios de alta: la lista de personas se muestra en otra UI (p. ej. filas de tabla) */
  addOnly = false,
  /** P. ej. bajo operativo: un botón "+ Otra persona" y recién al pulsar, el form de alta. */
  collapsibleAdd = false,
}) {
  const [perfilKey, setPerfilKey] = useState(0);
  const [addSectionOpen, setAddSectionOpen] = useState(() => !collapsibleAdd);
  const [manual, setManual] = useState({ nombre: "", apellido: "", email: "" });
  const [ficha, setFicha] = useState({ nombre: "", apellido: "", email: "", dni: "" });
  const [showFicha, setShowFicha] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alertModal, setAlertModal] = useState(null);
  const [paxIdToLiberar, setPaxIdToLiberar] = useState(null);
  const pasajeros = reserva.pasajeros || [];
  useEffect(() => {
    setAddSectionOpen(!collapsibleAdd);
  }, [reserva.id, collapsibleAdd]);
  const inUse = new Set(pasajeros.map((p) => p.id_perfil).filter(Boolean));
  const excluded = new Set((excludedProfileIds || []).filter(Boolean));
  const perfilesById = useMemo(() => {
    const o = {};
    (allProfiles || []).forEach((p) => {
      if (p?.id) o[p.id] = p;
    });
    return o;
  }, [allProfiles]);
  const options = (allProfiles || []).filter(
    (p) => p.id && p.id !== reserva.id_usuario && !inUse.has(p.id) && !excluded.has(p.id),
  );

  const addPerfil = async (id) => {
    if (!id) return;
    const p = allProfiles.find((x) => x.id === id);
    if (!p) return;
    setBusy(true);
    const { error } = await supabase
      .from("scrn_reserva_pasajeros")
      .insert(rowReservaPaxDesdePerfil({ id_reserva: reserva.id, id_perfil: p.id }));
    setBusy(false);
    if (error) {
      setAlertModal({ title: "No se pudo añadir", message: error.message });
      return;
    }
    setPerfilKey((k) => k + 1);
    onReload?.();
  };

  const addManual = async () => {
    const n = manual.nombre.trim();
    const a = manual.apellido.trim();
    const e = manual.email.trim();
    if (!n || !a || !e) {
      setAlertModal({
        title: "Faltan datos",
        message: "Completá nombre, apellido y email de la persona.",
      });
      return;
    }
    setBusy(true);
    const created = await ensureScrnPerfilForNewEmail({
      email: e,
      nombre: n,
      apellido: a,
    });
    if (created.error) {
      setBusy(false);
      setAlertModal({ title: "No se pudo dar de alta el perfil", message: created.error });
      return;
    }
    const { error } = await supabase
      .from("scrn_reserva_pasajeros")
      .insert(rowReservaPaxDesdePerfil({ id_reserva: reserva.id, id_perfil: created.id }));
    setBusy(false);
    if (error) {
      setAlertModal({ title: "No se pudo añadir", message: error.message });
      return;
    }
    setManual({ nombre: "", apellido: "", email: "" });
    onReload?.();
  };

  const addFichaNueva = async () => {
    const n = ficha.nombre.trim();
    const a = ficha.apellido.trim();
    const e = ficha.email.trim();
    const d = ficha.dni.trim();
    if (!n || !a || !e) {
      setAlertModal({
        title: "Faltan datos",
        message: "Completá nombre, apellido y email para la ficha (sin login aún).",
      });
      return;
    }
    setBusy(true);
    const created = await ensureScrnPerfilForNewEmail({
      email: e,
      nombre: n,
      apellido: a,
      dni: d || undefined,
    });
    if (created.error) {
      setBusy(false);
      setAlertModal({ title: "No se pudo dar de alta el perfil", message: created.error });
      return;
    }
    const notas = d ? `DNI: ${d}` : null;
    const { error } = await supabase
      .from("scrn_reserva_pasajeros")
      .insert(
        rowReservaPaxDesdePerfil({
          id_reserva: reserva.id,
          id_perfil: created.id,
          notas,
        }),
      );
    setBusy(false);
    if (error) {
      setAlertModal({ title: "No se pudo añadir la ficha", message: error.message });
      return;
    }
    setFicha({ nombre: "", apellido: "", email: "", dni: "" });
    setShowFicha(false);
    onReload?.();
  };

  const runRemovePax = async (paxId) => {
    setBusy(true);
    const { error } = await supabase
      .from("scrn_reserva_pasajeros")
      .delete()
      .eq("id", paxId);
    setBusy(false);
    if (error) {
      setAlertModal({ title: "No se pudo eliminar", message: error.message });
      return;
    }
    setPaxIdToLiberar(null);
    onReload?.();
  };

  return (
    <>
      <AlertModal
        isOpen={Boolean(alertModal)}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title || ""}
        message={alertModal?.message || ""}
      />
      <ConfirmModal
        isOpen={paxIdToLiberar != null}
        onClose={() => setPaxIdToLiberar(null)}
        title="Liberar plaza"
        message="¿Liberar este lugar? Se quita a esta persona de la reserva."
        confirmText="Liberar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
        onConfirm={() => (paxIdToLiberar != null ? runRemovePax(paxIdToLiberar) : undefined)}
      />
      {compact ? (
      <div className="text-[10px] text-slate-700 space-y-1 max-w-full flex flex-col justify-center min-h-0">
        {!tableRow && (
          <div className="font-semibold text-slate-600">
            Personas · {1 + pasajeros.length} pl.
            {readOnly ? <span className="ml-1 font-normal text-slate-400">(lect.)</span> : null}
          </div>
        )}
        {tableRow && !readOnly && !addOnly && (
          <div className="text-[9px] text-slate-500">
            {1 + pasajeros.length} plaza{1 + pasajeros.length === 1 ? "" : "s"} en total
          </div>
        )}
        {!addOnly && pasajeros.length > 0 && (
          <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-1 sm:items-center max-w-full">
            {pasajeros.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center min-h-8 gap-0.5 rounded border border-slate-200 bg-white/95 pl-1 pr-0.5 max-w-full"
              >
                <span className="font-medium truncate">
                  {paxNombreCompleto(p, perfilesById)}
                  {paxEmailMostrar(p) ? (
                    <span className="text-slate-500 font-normal"> {paxEmailMostrar(p)}</span>
                  ) : null}
                </span>
                {p.id_perfil ? (
                  <span className="shrink-0 text-[8px] uppercase text-emerald-700 font-bold">P</span>
                ) : null}
                {!readOnly && (
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => setPaxIdToLiberar(p.id)}
                    title="Liberar plaza (quita a esta persona de la reserva)"
                    className="shrink-0 rounded border border-rose-200/80 bg-rose-50/90 px-1 py-0.5 text-[7px] font-extrabold uppercase leading-tight text-rose-800 hover:bg-rose-100/90"
                  >
                    Liberar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {collapsibleAdd && !readOnly && !addSectionOpen ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setAddSectionOpen(true)}
            className="w-full sm:w-auto rounded-lg border border-dashed border-slate-400/90 bg-slate-50/80 px-2.5 py-1.5 text-left text-[10px] font-extrabold uppercase tracking-wide text-slate-800 hover:bg-slate-100/90"
          >
            + Otra persona
          </button>
        ) : null}
        {!readOnly && (collapsibleAdd ? addSectionOpen : true) && (
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-1.5 gap-y-1 w-full">
              <select
                key={perfilKey}
                defaultValue=""
                disabled={disabled || busy || options.length === 0}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) addPerfil(v);
                }}
                className="h-9 sm:h-8 w-full sm:max-w-[8rem] box-border text-[10px] rounded border border-slate-300 py-0.5 px-0.5 bg-white"
              >
                <option value="">{options.length ? "+ perfil" : "— perfiles"}</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.apellido}, {p.nombre}
                  </option>
                ))}
              </select>
              <input
                placeholder="Nom."
                value={manual.nombre}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full sm:w-14 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
              />
              <input
                placeholder="Ape."
                value={manual.apellido}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, apellido: e.target.value }))}
                className="w-full sm:w-14 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
              />
              <input
                type="email"
                placeholder="mail"
                value={manual.email}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full sm:w-24 min-w-0 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
              />
              <button
                type="button"
                disabled={disabled || busy}
                onClick={addManual}
                title="Persona sin registro aún (nombre, apellido, email)"
                className="h-9 sm:h-8 w-full sm:w-auto px-2 rounded bg-slate-700 text-white text-[9px] font-bold"
              >
                +
              </button>
            </div>
            <div>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => setShowFicha((s) => !s)}
                className="text-[9px] font-extrabold uppercase tracking-wide text-sky-800 underline decoration-sky-500/50 underline-offset-2"
              >
                {showFicha ? "Ocultar" : "Nueva ficha (sin perfil aún)"}
              </button>
            </div>
            {showFicha ? (
              <div className="rounded border border-sky-200/80 bg-sky-50/50 p-1.5 space-y-1">
                <p className="text-[8px] leading-tight text-slate-600">
                  No abre un usuario. Guarda notas (DNI) para oficina. Si luego alguien se registra, se puede
                  vincular al perfil.
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-1.5">
                  <input
                    placeholder="Nombre"
                    value={ficha.nombre}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full sm:w-20 min-w-0 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
                  />
                  <input
                    placeholder="Apellido"
                    value={ficha.apellido}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, apellido: e.target.value }))}
                    className="w-full sm:w-24 min-w-0 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
                  />
                  <input
                    type="email"
                    placeholder="email"
                    value={ficha.email}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, email: e.target.value }))}
                    className="w-full sm:w-28 min-w-0 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
                  />
                  <input
                    placeholder="DNI (opt.)"
                    value={ficha.dni}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, dni: e.target.value }))}
                    className="w-full sm:w-20 h-9 sm:h-8 box-border text-[10px] rounded border border-slate-300 px-0.5"
                  />
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={addFichaNueva}
                    className="h-9 sm:h-8 w-full sm:w-auto px-2 rounded border border-sky-600/80 bg-sky-800 text-white text-[8px] font-extrabold uppercase"
                  >
                    Añadir ficha
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      ) : (
    <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
      <div className="text-xs font-bold text-slate-600">
        Otras personas en la reserva
        {readOnly ? (
          <span className="ml-1 font-normal text-slate-500">(solo lectura)</span>
        ) : null}
      </div>
      {!addOnly && (
      <div className="text-xs text-slate-600">
        Plazas totales: {1 + pasajeros.length}{" "}
        <span className="text-slate-500">
          {pasajeros.length > 0
            ? `(quien inscribe + ${pasajeros.length} persona${pasajeros.length === 1 ? "" : "s"} más)`
            : "(solo quien inscribe la solicitud)"}
        </span>
      </div>
      )}
      {!addOnly && pasajeros.length > 0 && (
        <ul className="space-y-1">
          {pasajeros.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 bg-white rounded-lg border border-slate-100 px-2 py-1.5"
            >
              <span>
                <span className="font-semibold">
                  {paxNombreCompleto(p, perfilesById)}
                </span>
                {paxEmailMostrar(p) ? (
                  <span className="text-slate-500"> · {paxEmailMostrar(p)}</span>
                ) : null}
                {p.id_perfil ? (
                  <span className="ml-1 text-[10px] uppercase text-emerald-700 font-bold">
                    Perfil
                  </span>
                ) : null}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => setPaxIdToLiberar(p.id)}
                  title="Liberar plaza (quita a esta persona)"
                  className="shrink-0 px-2 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800 text-[10px] font-bold uppercase"
                >
                  Liberar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Añadir desde perfiles
            </label>
            <select
              key={perfilKey}
              defaultValue=""
              disabled={disabled || busy || options.length === 0}
              onChange={(e) => {
                const v = e.target.value;
                if (v) addPerfil(v);
              }}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">{options.length ? "Elegir…" : "Sin perfiles libres"}</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              Otra persona (nombre, apellido, email)
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-end">
              <input
                placeholder="Nombre"
                value={manual.nombre}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, nombre: e.target.value }))}
                className="w-full sm:flex-1 min-w-0 sm:min-w-[5rem] rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Apellido"
                value={manual.apellido}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, apellido: e.target.value }))}
                className="w-full sm:flex-1 min-w-0 sm:min-w-[5rem] rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={manual.email}
                disabled={disabled || busy}
                onChange={(e) => setManual((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full sm:flex-1 min-w-0 sm:min-w-[6rem] rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={disabled || busy}
                onClick={addManual}
                className="w-full sm:w-auto px-3 py-2 sm:py-1 rounded-lg bg-slate-700 text-white text-xs font-bold"
              >
                Añadir
              </button>
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1 border-t border-slate-200 pt-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => setShowFicha((s) => !s)}
              className="text-xs font-extrabold text-sky-800 underline decoration-sky-500/50 underline-offset-2"
            >
              {showFicha ? "Ocultar" : "Nueva ficha (sin perfil aún, con nota interna)"}
            </button>
            {showFicha ? (
              <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 p-2 space-y-2">
                <p className="text-xs text-slate-600 leading-snug">
                  No abre un usuario. Los datos quedan en la reserva; el DNI va en notas. Si luego alguien se
                  registra, vinculá o fusioná con un perfil.
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-end">
                  <input
                    placeholder="Nombre"
                    value={ficha.nombre}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full sm:flex-1 min-w-0 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Apellido"
                    value={ficha.apellido}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, apellido: e.target.value }))}
                    className="w-full sm:flex-1 min-w-0 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={ficha.email}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, email: e.target.value }))}
                    className="w-full sm:flex-1 min-w-0 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="DNI (opcional)"
                    value={ficha.dni}
                    disabled={disabled || busy}
                    onChange={(e) => setFicha((p) => ({ ...p, dni: e.target.value }))}
                    className="w-full sm:w-32 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={addFichaNueva}
                    className="w-full sm:w-auto px-3 py-2.5 sm:py-1.5 rounded-lg border border-sky-600/80 bg-sky-800 text-white text-xs font-extrabold uppercase"
                  >
                    Añadir ficha
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
      )}
    </>
  );
}
