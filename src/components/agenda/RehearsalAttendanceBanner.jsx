import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  IconLoader,
  IconWatch,
  IconQr,
  IconCameraScanQr,
} from "../ui/Icons";
import ConfirmModal from "../ui/ConfirmModal";
import {
  ensayoCheckinGps,
  ensayoCheckoutGps,
  ensayoGenerarPaseUbicacion,
  ensayoCheckinPase,
} from "../../services/ensayoCheckinService";
import { formatRegistradoHora } from "../../services/ensayoCheckinReportService";
import {
  requestPosition,
  geolocationErrorMessage,
  geolocationAndroidOverlayHint,
  isAndroidDevice,
} from "../../utils/geolocation";
import { decodeQrFromImageFile } from "../../utils/qrDecodeFromImage";
import {
  pickEnsayoBannerTarget,
  ensayoBannerTitle,
  ensayoBannerSubtitle,
  formatElapsedHms,
  parseEnsayoParedLocal,
  puedeOfrecerPaseGps,
  ENSAYO_CHECKIN_PRE_MINUTES,
} from "../../utils/ensayoCheckinBanner";

/**
 * Banner sticky: mismo set de íconos que RehearsalCheckInBlock (GPS / escanear / ofrecer QR),
 * con confirmación antes de registrar ingreso o salida.
 */
export default function RehearsalAttendanceBanner({
  events,
  integranteId,
  getEstado,
  onSuccess,
}) {
  const [now, setNow] = useState(() => new Date());
  /** 'ingreso_gps' | 'salida_gps' | 'ingreso_scan' | 'salida_scan' */
  const [confirmKind, setConfirmKind] = useState(null);
  const [busy, setBusy] = useState(false);
  const [geoAssist, setGeoAssist] = useState(null);
  const [showPeer, setShowPeer] = useState(false);
  const [paseQrUrl, setPaseQrUrl] = useState(null);
  const [paseExpiresAt, setPaseExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [decodingQr, setDecodingQr] = useState(false);
  const [scanPhase, setScanPhase] = useState("entrada");
  const qrPhotoRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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
        setPaseQrUrl(null);
        setPaseExpiresAt(null);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [paseExpiresAt]);

  const target = useMemo(
    () =>
      integranteId ? pickEnsayoBannerTarget(events, getEstado, now) : null,
    [events, getEstado, now, integranteId],
  );

  const evt = target?.evt || null;
  const estado = target?.estado || null;
  const phase = target?.phase || "idle";
  const title = evt ? ensayoBannerTitle(evt) : "";
  const subtitle = evt ? ensayoBannerSubtitle(evt) : "";
  const label = [title, subtitle].filter(Boolean).join(" · ");
  const llegadaHora = formatRegistradoHora(estado?.registrado_at);
  const llegadaAtLocal = parseEnsayoParedLocal(estado?.registrado_at);
  const elapsedMs = llegadaAtLocal
    ? now.getTime() - llegadaAtLocal.getTime()
    : 0;
  const puedeGenerarPase = puedeOfrecerPaseGps(estado, now);
  const actionPhase = phase === "activo" ? "salida" : "ingreso";

  const submitGps = async (kind, { lat, lng, precisionM }) => {
    if (!evt?.id) return null;
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : null;
    if (kind === "salida") {
      const res = await ensayoCheckoutGps({
        eventoId: evt.id,
        integranteId,
        lat,
        lng,
        precisionM,
        userAgent,
      });
      if (res?.ok) {
        toast.success(
          res.ya_registrado
            ? `Ya tenías salida (${formatRegistradoHora(res.salida_at)})`
            : `Salida registrada (${formatRegistradoHora(res.salida_at)})`,
        );
        setGeoAssist(null);
        onSuccess?.();
      }
      return res;
    }
    const res = await ensayoCheckinGps({
      eventoId: evt.id,
      integranteId,
      lat,
      lng,
      precisionM,
      userAgent,
    });
    if (res?.ok) {
      toast.success(
        res.ya_registrado
          ? `Ya tenías ingreso (${formatRegistradoHora(res.registrado_at)})`
          : `Ingreso registrado (${formatRegistradoHora(res.registrado_at)})`,
      );
      setGeoAssist(null);
      onSuccess?.();
    }
    return res;
  };

  const runGps = async (kind) => {
    setBusy(true);
    setGeoAssist(null);
    try {
      const pos = await requestPosition();
      await submitGps(kind, {
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
          kind,
          code: err.code,
          message: geolocationErrorMessage(err),
        });
      } else {
        toast.error(
          err?.message ||
            (kind === "salida"
              ? "No se pudo registrar la salida"
              : "No se pudo registrar el ingreso"),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const openScanUi = (forPhase) => {
    setScanPhase(forPhase === "salida" ? "salida" : "entrada");
    setPaseQrUrl(null);
    setPaseExpiresAt(null);
    setShowPeer(true);
  };

  const handleConfirm = async () => {
    const kind = confirmKind;
    if (!kind) return;
    if (kind === "ingreso_gps") await runGps("ingreso");
    else if (kind === "salida_gps") await runGps("salida");
    else if (kind === "ingreso_scan") openScanUi("entrada");
    else if (kind === "salida_scan") openScanUi("salida");
  };

  const handleSinUbicacion = async () => {
    if (!geoAssist || busy) return;
    setBusy(true);
    try {
      await submitGps(geoAssist.kind, {
        lat: null,
        lng: null,
        precisionM: null,
      });
    } catch (e) {
      toast.error(e.message || "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  };

  const handleRetryGeo = async () => {
    if (!geoAssist || busy) return;
    setBusy(true);
    try {
      const pos = await requestPosition({ maximumAge: 0 });
      await submitGps(geoAssist.kind, {
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
          kind: geoAssist.kind,
          code: err.code,
          message: geolocationErrorMessage(err),
        });
      } else {
        toast.error(err?.message || "No se pudo registrar");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGenerarPase = async () => {
    if (!integranteId || !evt?.id || busy) return;
    setBusy(true);
    try {
      const res = await ensayoGenerarPaseUbicacion(
        evt.id,
        integranteId,
        "entrada",
      );
      if (res?.ok && res.token) {
        setPaseExpiresAt(res.expires_at);
        const url = await QRCode.toDataURL(res.token, { margin: 1, width: 280 });
        setPaseQrUrl(url);
        setShowPeer(true);
        toast.success("Mostrá este QR a tu compañero (20 s)");
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
      const res = await ensayoCheckinPase(
        text.trim(),
        integranteId,
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      );
      if (!res?.ok) {
        const msg =
          res?.reason === "pase_expirado"
            ? "El QR expiró. Pedí uno nuevo."
            : res?.reason === "pase_usado"
              ? "Este QR ya fue usado."
              : "QR no válido";
        toast.error(msg);
        return;
      }
      const isSalida = res.proposito === "salida" || !!res.salida_at;
      toast.success(
        isSalida
          ? res.ya_registrado
            ? `Ya tenías salida (${formatRegistradoHora(res.salida_at)})`
            : `Salida registrada (${formatRegistradoHora(res.salida_at)})`
          : res.ya_registrado
            ? `Ya tenías ingreso (${formatRegistradoHora(res.registrado_at)})`
            : `Ingreso registrado (${formatRegistradoHora(res.registrado_at)})`,
      );
      setShowPeer(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || "Error al escanear");
    } finally {
      setDecodingQr(false);
      e.target.value = "";
    }
  };

  if (!integranteId || !target || phase === "idle" || phase === "done") {
    return null;
  }

  const iconBtnClass =
    "p-2 rounded-lg border disabled:opacity-50 flex items-center justify-center shrink-0 bg-white/95 shadow-sm";

  const confirmIsSalida =
    confirmKind === "salida_gps" || confirmKind === "salida_scan";
  const confirmIsScan =
    confirmKind === "ingreso_scan" || confirmKind === "salida_scan";

  return (
    <>
      <div
        className={`shrink-0 border-b px-3 py-2 ${
          phase === "activo"
            ? "bg-emerald-600 border-emerald-700 text-white"
            : "bg-amber-500 border-amber-600 text-white"
        }`}
        role="status"
      >
        <div className="flex items-center gap-2 max-w-5xl mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-95">
              {phase === "activo"
                ? "En ensayo · ingreso marcado"
                : `Pendiente de ingreso · desde ${ENSAYO_CHECKIN_PRE_MINUTES} min antes`}
            </p>
            <p className="text-sm font-black truncate leading-tight">{title}</p>
            {subtitle ? (
              <p className="text-[11px] font-semibold truncate opacity-90 leading-tight">
                {subtitle}
              </p>
            ) : null}
            {phase === "activo" && (
              <p className="text-xs font-mono font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
                <IconWatch size={14} />
                {formatElapsedHms(elapsedMs)}
                {llegadaHora ? (
                  <span className="opacity-90 font-sans font-semibold">
                    · llegada {llegadaHora}
                  </span>
                ) : null}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirmKind(
                  actionPhase === "salida" ? "salida_gps" : "ingreso_gps",
                )
              }
              className={`${iconBtnClass} ${
                actionPhase === "salida"
                  ? "text-emerald-800 border-emerald-200"
                  : "text-amber-800 border-amber-200"
              }`}
              title={
                actionPhase === "salida"
                  ? "Registrar hora de salida (GPS)"
                  : "Registrar hora de llegada (GPS)"
              }
              aria-label={
                actionPhase === "salida"
                  ? "Registrar salida GPS"
                  : "Registrar ingreso GPS"
              }
            >
              {busy && !decodingQr ? (
                <IconLoader size={18} className="animate-spin" />
              ) : (
                <IconWatch size={18} />
              )}
            </button>
            <button
              type="button"
              disabled={busy || decodingQr}
              onClick={() =>
                setConfirmKind(
                  actionPhase === "salida" ? "salida_scan" : "ingreso_scan",
                )
              }
              className={`${iconBtnClass} text-slate-700 border-slate-200`}
              title="Escanear QR de compañero"
              aria-label="Escanear QR de compañero"
            >
              {decodingQr ? (
                <IconLoader size={18} className="animate-spin" />
              ) : (
                <IconCameraScanQr size={18} />
              )}
            </button>
            {puedeGenerarPase && (
              <button
                type="button"
                disabled={busy}
                onClick={handleGenerarPase}
                className={`${iconBtnClass} text-violet-700 border-violet-200`}
                title="Mostrar QR a compañero (20 s)"
                aria-label="Mostrar QR a compañero"
              >
                {busy ? (
                  <IconLoader size={18} className="animate-spin" />
                ) : (
                  <IconQr size={18} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmKind}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleConfirm}
        title={
          confirmIsScan
            ? confirmIsSalida
              ? "¿Escanear QR para salida?"
              : "¿Escanear QR para ingreso?"
            : confirmIsSalida
              ? "¿Registrar salida?"
              : "¿Registrar ingreso?"
        }
        message={
          confirmIsScan
            ? `Vas a escanear el QR de un compañero para «${label}». ¿Confirmás?`
            : confirmIsSalida
              ? `Vas a registrar la hora de salida de «${label}». ¿Confirmás?`
              : `Vas a registrar la hora de llegada a «${label}». ¿Confirmás?`
        }
        confirmText={
          confirmIsScan
            ? "Sí, escanear"
            : confirmIsSalida
              ? "Sí, salir"
              : "Sí, ingresar"
        }
        cancelText="Cancelar"
        confirmLoading={busy}
        confirmClassName={
          confirmIsSalida
            ? "px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            : "px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
        }
      />

      {geoAssist &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Ubicación no disponible
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {geoAssist.message}
              </p>
              {geoAssist.code === "denied" && isAndroidDevice() && (
                <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                  {geolocationAndroidOverlayHint()}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={handleRetryGeo}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {busy ? "Obteniendo GPS…" : "Reintentar ubicación"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setGeoAssist(null);
                  openScanUi(geoAssist.kind === "salida" ? "salida" : "entrada");
                }}
                className="w-full py-2.5 rounded-lg border-2 border-indigo-200 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2"
              >
                <IconCameraScanQr size={18} />
                Escanear QR de un compañero
              </button>
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
          </div>,
          document.body,
        )}

      {showPeer &&
        !paseQrUrl &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 text-center">
              <p className="text-sm font-bold text-slate-800 mb-2">
                {scanPhase === "salida"
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
                onClick={() => setShowPeer(false)}
              >
                Cerrar
              </button>
            </div>
          </div>,
          document.body,
        )}

      {showPeer &&
        paseQrUrl &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl p-4 text-center max-w-sm w-full">
              <p className="text-sm font-bold text-slate-800 mb-2">
                QR para compañero
              </p>
              <img src={paseQrUrl} alt="QR" className="mx-auto w-56" />
              <p className="text-xs mt-2">Vence en {countdown}s</p>
              <button
                type="button"
                className="mt-2 text-xs underline"
                onClick={() => {
                  setShowPeer(false);
                  setPaseQrUrl(null);
                  setPaseExpiresAt(null);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
