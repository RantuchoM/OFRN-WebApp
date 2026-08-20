import React, { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  IconLoader,
  IconCheck,
  IconWatch,
  IconQr,
  IconCameraScanQr,
} from "../ui/Icons";
import {
  ensayoCheckinGps,
  ensayoCheckoutGps,
  ensayoGenerarPaseUbicacion,
  ensayoCheckinPase,
  ensayoCheckinPersistAndVerify,
  ensayoCheckinPaseErrorMessage,
  ensayoCheckinPersistError,
  ensayoCheckinRequirePersisted,
} from "../../services/ensayoCheckinService";
import EnsayoCheckinRegistrandoOverlay from "./EnsayoCheckinRegistrandoOverlay";
import { formatRegistradoHora } from "../../services/ensayoCheckinReportService";
import { requestPosition, geolocationErrorMessage, geolocationAndroidOverlayHint, isAndroidDevice } from "../../utils/geolocation";
import { decodeQrFromImageFile } from "../../utils/qrDecodeFromImage";
import { puedeOfrecerPaseGps } from "../../utils/ensayoCheckinBanner";
import { cancelLocalSalidaReminders } from "../../utils/ensayoLocalSalidaReminders";
import {
  onEnsayoAltaLocalReminders,
  syncEnsayoLocalReminders,
} from "../../utils/ensayoLocalRemindersSync";

const formatHora = formatRegistradoHora;

export default function RehearsalCheckInBlock({
  evt,
  integranteId,
  isToday,
  estado,
  onSuccess,
  onEstadoPatch,
  /** Si true, renderiza hora_inicio/fin del evento emparejadas con llegada/salida. */
  pairWithSchedule = false,
  /** Clases para las horas de agenda (solo con pairWithSchedule). */
  scheduleTimeClassName = "text-sm font-bold text-slate-600",
  scheduleEndClassName = "text-sm font-normal text-slate-600",
}) {
  const [busy, setBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showPeer, setShowPeer] = useState(false);
  const [paseToken, setPaseToken] = useState(null);
  const [paseQrUrl, setPaseQrUrl] = useState(null);
  const [paseExpiresAt, setPaseExpiresAt] = useState(null);
  const [paseProposito, setPaseProposito] = useState("entrada");
  const [countdown, setCountdown] = useState(0);
  const qrPhotoRef = useRef(null);
  const [decodingQr, setDecodingQr] = useState(false);
  const [geoAssist, setGeoAssist] = useState(null);
  /** 'entrada' | 'salida' — contexto del modal GPS / escaneo */
  const [phase, setPhase] = useState("entrada");
  const [now, setNow] = useState(() => new Date());

  const yaIngreso = !!estado?.registrado_at;
  const yaSalida = !!estado?.salida_at;
  const puedeGenerarPase =
    isToday && puedeOfrecerPaseGps(estado, now);

  // Actualizar margen post-salida del QR (~10 min)
  useEffect(() => {
    if (!yaSalida || !estado?.modo || estado.modo !== "gps") return undefined;
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, [yaSalida, estado?.modo]);

  // Si ya había llegada al abrir la tarjeta: rearmar alarms locales offline
  useEffect(() => {
    if (!isToday || !evt?.id) return;
    if (yaSalida) {
      cancelLocalSalidaReminders(evt.id);
      return;
    }
    if (yaIngreso && estado?.registrado_at) {
      onEnsayoAltaLocalReminders(evt, estado).catch(() => {});
    }
  }, [isToday, evt, yaIngreso, yaSalida, estado?.registrado_at]);

  useEffect(() => {
    if (!paseExpiresAt) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((new Date(paseExpiresAt).getTime() - Date.now()) / 1000),
      );
      setCountdown(left);
      if (left <= 0) {
        setPaseToken(null);
        setPaseQrUrl(null);
        setPaseExpiresAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [paseExpiresAt]);

  const applyPersisted = async (phase, res, estadoDb) => {
    const hora =
      phase === "salida"
        ? formatHora(estadoDb.salida_at || res.salida_at)
        : formatHora(estadoDb.registrado_at || res.registrado_at);
    toast.success(
      phase === "salida"
        ? res.ya_registrado
          ? `Ya registraste salida a las ${hora}`
          : `Salida registrada (${hora})`
        : res.ya_registrado
          ? `Ya registraste ingreso a las ${hora}`
          : `Ingreso registrado (${hora})`,
    );
    setGeoAssist(null);
    onEstadoPatch?.(evt.id, estadoDb);
    if (phase === "salida") {
      cancelLocalSalidaReminders(evt.id);
      if (integranteId) {
        syncEnsayoLocalReminders(integranteId).catch(() => {});
      }
    } else {
      onEnsayoAltaLocalReminders(evt, {
        registrado_at: estadoDb.registrado_at || res.registrado_at,
        salida_at: estadoDb.salida_at || null,
      });
    }
    Promise.resolve(onSuccess?.()).catch(() => {});
  };

  const persistGps = async (phase, { lat, lng, precisionM }) => {
    setRegistering(true);
    try {
      const { res, estado: estadoDb } = await ensayoCheckinPersistAndVerify({
        phase,
        rpcFn: () =>
          phase === "salida"
            ? ensayoCheckoutGps({
                eventoId: evt.id,
                integranteId,
                lat,
                lng,
                precisionM,
                userAgent:
                  typeof navigator !== "undefined" ? navigator.userAgent : null,
              })
            : ensayoCheckinGps({
                eventoId: evt.id,
                integranteId,
                lat,
                lng,
                precisionM,
                userAgent:
                  typeof navigator !== "undefined" ? navigator.userAgent : null,
              }),
      });
      await applyPersisted(phase, res, estadoDb);
      return res;
    } finally {
      setRegistering(false);
    }
  };

  const handleGpsAction = async (forPhase) => {
    if (!integranteId || busy) return;
    setPhase(forPhase);
    setBusy(true);
    try {
      const pos = await requestPosition();
      await persistGps(forPhase === "salida" ? "salida" : "entrada", {
        lat: pos.lat,
        lng: pos.lng,
        precisionM: pos.accuracy,
      });
    } catch (err) {
      if (
        err?.code === "denied" ||
        err?.code === "timeout" ||
        err?.code === "unavailable" ||
        err?.code === "unsupported"
      ) {
        setGeoAssist({
          code: err.code,
          message: geolocationErrorMessage(err),
          phase: forPhase,
        });
      } else {
        toast.error(
          err?.message ||
            ensayoCheckinPersistError(
              forPhase === "salida" ? "salida" : "entrada",
            ).message,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRetryGeolocation = async () => {
    if (!integranteId || busy) return;
    const forPhase = geoAssist?.phase || phase;
    setBusy(true);
    try {
      const pos = await requestPosition({ maximumAge: 0 });
      await persistGps(forPhase === "salida" ? "salida" : "entrada", {
        lat: pos.lat,
        lng: pos.lng,
        precisionM: pos.accuracy,
      });
    } catch (err) {
      if (
        err?.code === "denied" ||
        err?.code === "timeout" ||
        err?.code === "unavailable" ||
        err?.code === "unsupported"
      ) {
        setGeoAssist({
          code: err.code,
          message: geolocationErrorMessage(err),
          phase: forPhase,
        });
        if (err.code === "denied") {
          toast.info(
            isAndroidDevice()
              ? "Si Android bloqueó el permiso, cerrá burbujas flotantes de otras apps e intentá de nuevo."
              : "Si ya negaste el permiso, activá la ubicación para este sitio en Ajustes del navegador y volvé a intentar.",
          );
        }
      } else {
        toast.error(
          err?.message ||
            ensayoCheckinPersistError(
              forPhase === "salida" ? "salida" : "entrada",
            ).message,
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSinUbicacion = async () => {
    if (!integranteId || busy) return;
    const forPhase = geoAssist?.phase || phase;
    setBusy(true);
    try {
      await persistGps(forPhase === "salida" ? "salida" : "entrada", {
        lat: null,
        lng: null,
        precisionM: null,
      });
    } catch (e) {
      toast.error(
        e.message ||
          ensayoCheckinPersistError(
            forPhase === "salida" ? "salida" : "entrada",
          ).message,
      );
    } finally {
      setBusy(false);
    }
  };

  const goToQrScan = () => {
    setGeoAssist(null);
    openScanPeer(geoAssist?.phase || phase);
  };

  const openScanPeer = (forPhase = "entrada") => {
    setPhase(forPhase);
    setPaseProposito(forPhase);
    setPaseQrUrl(null);
    setPaseToken(null);
    setPaseExpiresAt(null);
    setShowPeer(true);
  };

  const handleGenerarPase = async (forPhase = "entrada") => {
    if (!integranteId || busy) return;
    setBusy(true);
    try {
      const res = await ensayoGenerarPaseUbicacion(
        evt.id,
        integranteId,
        forPhase,
      );
      if (res?.ok && res.token) {
        setPaseProposito(forPhase);
        setPaseToken(res.token);
        setPaseExpiresAt(res.expires_at);
        const url = await QRCode.toDataURL(res.token, { margin: 1, width: 280 });
        setPaseQrUrl(url);
        setShowPeer(true);
        toast.success(
          forPhase === "salida"
            ? "Mostrá este QR de salida a tu compañero (20 s)"
            : "Mostrá este QR a tu compañero (20 s)",
        );
      }
    } catch (e) {
      toast.error(e.message || "No se pudo generar el pase");
    } finally {
      setBusy(false);
    }
  };

  const handleScanPase = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !integranteId) return;
    setDecodingQr(true);
    try {
      const text = await decodeQrFromImageFile(file);
      if (!text?.trim()) {
        toast.error("No se leyó el QR");
        return;
      }
      setRegistering(true);
      const res = await ensayoCheckinPase(
        text.trim(),
        integranteId,
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      );
      const paseMsg = ensayoCheckinPaseErrorMessage(res);
      if (paseMsg) {
        toast.error(paseMsg);
        return;
      }
      const persistPhase =
        res?.proposito === "salida" || !!res?.salida_at ? "salida" : "entrada";
      const { res: persisted, estado: estadoDb } = ensayoCheckinRequirePersisted(
        res,
        persistPhase,
      );
      await applyPersisted(persistPhase, persisted, estadoDb);
      setShowPeer(false);
    } catch (err) {
      toast.error(err.message || "Error al escanear");
    } finally {
      setRegistering(false);
      setDecodingQr(false);
      e.target.value = "";
    }
  };

  if (evt?.is_deleted === true) return null;
  if (!isToday && !pairWithSchedule) return null;

  const iconBtnClass =
    "p-1 rounded border disabled:opacity-50 flex items-center justify-center shrink-0";

  const geoPhase = geoAssist?.phase || phase;
  const showGeoModal = !!geoAssist && isToday && (
    (geoPhase === "entrada" && !yaIngreso) ||
    (geoPhase === "salida" && yaIngreso && !yaSalida)
  );
  const showScanModal =
    isToday &&
    showPeer &&
    !paseQrUrl &&
    ((phase === "entrada" && !yaIngreso) ||
      (phase === "salida" && yaIngreso && !yaSalida));

  const hi = evt.hora_inicio?.slice(0, 5) || "";
  const hf =
    evt.hora_fin && evt.hora_fin !== evt.hora_inicio
      ? evt.hora_fin.slice(0, 5)
      : "";

  const llegadaBadge = yaIngreso ? (
    <span
      className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 text-center leading-tight inline-flex items-center gap-0.5 shrink-0"
      title="Hora de ingreso"
    >
      <IconCheck size={10} />
      {formatHora(estado.registrado_at)}
    </span>
  ) : null;

  const salidaBadge = yaSalida ? (
    <span
      className="text-[9px] font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded px-1 py-0.5 text-center leading-tight shrink-0"
      title="Hora de salida"
    >
      ↓ {formatHora(estado.salida_at)}
    </span>
  ) : null;

  const exitActions =
    isToday && yaIngreso && !yaSalida ? (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleGpsAction("salida")}
          className={`${iconBtnClass} text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100`}
          title="Registrar hora de salida"
          aria-label="Registrar hora de salida"
        >
          {busy && phase === "salida" ? (
            <IconLoader size={16} className="animate-spin" />
          ) : (
            <IconWatch size={16} />
          )}
        </button>
        <button
          type="button"
          disabled={busy || decodingQr}
          onClick={() => openScanPeer("salida")}
          className={`${iconBtnClass} text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100`}
          title="Escanear QR de compañero (salida)"
          aria-label="Escanear QR de compañero para salida"
        >
          {decodingQr && phase === "salida" ? (
            <IconLoader size={16} className="animate-spin" />
          ) : (
            <IconCameraScanQr size={16} />
          )}
        </button>
      </>
    ) : null;

  const entryActions =
    isToday && !yaIngreso ? (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleGpsAction("entrada")}
          className={`${iconBtnClass} text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100`}
          title="Registrar hora de llegada"
          aria-label="Registrar hora de llegada"
        >
          {busy ? (
            <IconLoader size={16} className="animate-spin" />
          ) : (
            <IconWatch size={16} />
          )}
        </button>
        <button
          type="button"
          disabled={busy || decodingQr}
          onClick={() => openScanPeer("entrada")}
          className={`${iconBtnClass} text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100`}
          title="Escanear QR de compañero"
          aria-label="Escanear QR de compañero"
        >
          {decodingQr ? (
            <IconLoader size={16} className="animate-spin" />
          ) : (
            <IconCameraScanQr size={16} />
          )}
        </button>
      </>
    ) : null;

  const qrButton =
    isToday && puedeGenerarPase ? (
      <button
        type="button"
        disabled={busy}
        onClick={() => handleGenerarPase("entrada")}
        className={`${iconBtnClass} text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100`}
        title="Mostrar QR a compañero (20 s)"
        aria-label="Mostrar QR a compañero"
      >
        {busy ? (
          <IconLoader size={16} className="animate-spin" />
        ) : (
          <IconQr size={16} />
        )}
      </button>
    ) : null;

  const modals = (
    <>
      <EnsayoCheckinRegistrandoOverlay open={registering} />
      {showGeoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-slate-800">
              Ubicación no disponible
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {geoAssist.message}
            </p>
            {geoAssist.code === "denied" && (
              <div className="space-y-1.5">
                {isAndroidDevice() ? (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 leading-snug">
                    <span className="font-bold block mb-0.5">Android</span>
                    {geolocationAndroidOverlayHint()}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    En iPhone: Ajustes → Safari/Chrome → este sitio → Ubicación.
                    Luego tocá &quot;Reintentar&quot;.
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleRetryGeolocation}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "Obteniendo GPS…" : "Reintentar ubicación"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={goToQrScan}
              className="w-full py-2.5 rounded-lg border-2 border-indigo-200 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50"
            >
              <IconCameraScanQr size={18} />
              Escanear QR de un compañero
            </button>
            <p className="text-[10px] text-slate-500 text-center leading-snug">
              Si un compañero ya registró ingreso con GPS, puede mostrarte un QR
              temporal (ícono QR violeta en su agenda).
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleSinUbicacion}
              className="w-full text-[11px] text-slate-500 underline"
            >
              Registrar solo la hora (sin ubicación)
            </button>
            <button
              type="button"
              className="w-full text-xs text-slate-400"
              onClick={() => setGeoAssist(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showScanModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-slate-800 mb-2">
              {phase === "salida"
                ? "Escanear QR de salida"
                : "Escanear QR de compañero"}
            </p>
            <input
              ref={qrPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScanPase}
            />
            <button
              type="button"
              disabled={decodingQr}
              onClick={() => qrPhotoRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-indigo-200 text-indigo-700 font-bold"
            >
              {decodingQr ? (
                <IconLoader className="animate-spin" size={20} />
              ) : (
                <IconCameraScanQr size={22} />
              )}
              Escanear QR
            </button>
            <button
              type="button"
              className="mt-3 text-xs text-slate-500 underline w-full"
              onClick={() => {
                setShowPeer(false);
                setPaseQrUrl(null);
                setPaseToken(null);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showPeer && paseQrUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 text-center max-w-sm w-full">
            <p className="text-sm font-bold text-slate-800 mb-2">
              {paseProposito === "salida"
                ? "QR de salida para compañero"
                : "QR para compañero"}
            </p>
            <img src={paseQrUrl} alt="QR" className="mx-auto w-56" />
            <p className="text-xs mt-2">Vence en {countdown}s</p>
            <button
              type="button"
              className="mt-2 text-xs underline"
              onClick={() => {
                setShowPeer(false);
                setPaseQrUrl(null);
                setPaseToken(null);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (pairWithSchedule) {
    return (
      <div
        className="font-mono flex flex-col gap-0.5 items-stretch min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span className={`shrink-0 ${scheduleTimeClassName}`}>{hi}</span>
          {isToday && llegadaBadge}
        </div>
        {(hf || (isToday && (yaIngreso || exitActions))) && (
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            {hf ? (
              <span className={`shrink-0 ${scheduleEndClassName}`}>{hf}</span>
            ) : null}
            {isToday && (salidaBadge || exitActions)}
          </div>
        )}
        {isToday && (entryActions || qrButton) && (
          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
            {entryActions}
            {qrButton}
          </div>
        )}
        {modals}
      </div>
    );
  }

  if (!isToday) return null;

  return (
    <div
      className="flex flex-row flex-wrap items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {llegadaBadge}
      {salidaBadge || exitActions}
      {entryActions}
      {qrButton}
      {modals}
    </div>
  );
}
