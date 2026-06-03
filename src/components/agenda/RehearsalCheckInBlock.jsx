import React, { useRef, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
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
  ensayoGenerarPaseUbicacion,
  ensayoCheckinPase,
} from "../../services/ensayoCheckinService";
import { requestPosition, geolocationErrorMessage } from "../../utils/geolocation";
import { decodeQrFromImageFile } from "../../utils/qrDecodeFromImage";

function formatHoraLlegada(iso) {
  if (!iso) return "";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (isNaN(d.getTime())) return "";
    return format(d, "HH:mm");
  } catch {
    return "";
  }
}

export default function RehearsalCheckInBlock({
  evt,
  integranteId,
  isToday,
  estado,
  onSuccess,
}) {
  const [busy, setBusy] = useState(false);
  const [showPeer, setShowPeer] = useState(false);
  const [paseToken, setPaseToken] = useState(null);
  const [paseQrUrl, setPaseQrUrl] = useState(null);
  const [paseExpiresAt, setPaseExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const qrPhotoRef = useRef(null);
  const [decodingQr, setDecodingQr] = useState(false);
  const [geoAssist, setGeoAssist] = useState(null);

  const yaIngreso = !!estado?.registrado_at;
  const puedeGenerarPase =
    yaIngreso && estado?.modo === "gps" && isToday;

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

  const submitCheckInGps = async ({ lat, lng, precisionM }) => {
    const res = await ensayoCheckinGps({
      eventoId: evt.id,
      integranteId,
      lat,
      lng,
      precisionM,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (res?.ok) {
      toast.success(
        res.ya_registrado
          ? `Ya registraste ingreso a las ${formatHoraLlegada(res.registrado_at)}`
          : `Ingreso registrado (${formatHoraLlegada(res.registrado_at)})`,
      );
      setGeoAssist(null);
      onSuccess?.();
    }
    return res;
  };

  const handleCheckIn = async () => {
    if (!integranteId || busy) return;
    setBusy(true);
    try {
      const pos = await requestPosition();
      await submitCheckInGps({
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
        });
      } else {
        toast.error(err?.message || "No se pudo registrar el ingreso");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRetryGeolocation = async () => {
    if (!integranteId || busy) return;
    setBusy(true);
    try {
      const pos = await requestPosition({ maximumAge: 0 });
      await submitCheckInGps({
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
        });
        if (err.code === "denied") {
          toast.info(
            "Si ya negaste el permiso, activá la ubicación para este sitio en Ajustes del navegador y volvé a intentar.",
          );
        }
      } else {
        toast.error(err?.message || "No se pudo registrar el ingreso");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCheckInSinUbicacion = async () => {
    if (!integranteId || busy) return;
    setBusy(true);
    try {
      await submitCheckInGps({ lat: null, lng: null, precisionM: null });
    } catch (e) {
      toast.error(e.message || "No se pudo registrar el ingreso");
    } finally {
      setBusy(false);
    }
  };

  const goToQrScan = () => {
    setGeoAssist(null);
    openScanPeer();
  };

  const openScanPeer = () => {
    setPaseQrUrl(null);
    setPaseToken(null);
    setPaseExpiresAt(null);
    setShowPeer(true);
  };

  const handleGenerarPase = async () => {
    if (!integranteId || busy) return;
    setBusy(true);
    try {
      const res = await ensayoGenerarPaseUbicacion(evt.id, integranteId);
      if (res?.ok && res.token) {
        setPaseToken(res.token);
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
      toast.success(
        res.ya_registrado
          ? `Ya tenías ingreso (${formatHoraLlegada(res.registrado_at)})`
          : `Ingreso registrado (${formatHoraLlegada(res.registrado_at)})`,
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

  if (!isToday) return null;

  const iconBtnClass =
    "p-1 rounded border disabled:opacity-50 flex items-center justify-center shrink-0";

  return (
    <div
      className="mt-1 flex flex-col gap-0.5 items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {yaIngreso ? (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 text-center leading-tight flex items-center gap-0.5"
            title="Hora de ingreso"
          >
            <IconCheck size={10} />
            {formatHoraLlegada(estado.registrado_at)}
          </span>
          {puedeGenerarPase && (
            <button
              type="button"
              disabled={busy}
              onClick={handleGenerarPase}
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
          )}
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleCheckIn}
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
            onClick={openScanPeer}
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
        </div>
      )}

      {geoAssist && !yaIngreso && (
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
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                En iPhone/Android: Ajustes del navegador → este sitio → permitir
                ubicación. Luego tocá &quot;Reintentar&quot;.
              </p>
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
              onClick={handleCheckInSinUbicacion}
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

      {showPeer && !yaIngreso && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-slate-800 mb-2">
              {paseQrUrl ? "QR para compañero" : "Escanear QR de compañero"}
            </p>
            {paseQrUrl ? (
              <>
                <img src={paseQrUrl} alt="QR pase" className="mx-auto w-56 rounded" />
                <p className="text-xs text-slate-500 mt-2">
                  Vence en {countdown}s
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
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

      {showPeer && yaIngreso && paseQrUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 text-center max-w-sm w-full">
            <img src={paseQrUrl} alt="QR" className="mx-auto w-56" />
            <p className="text-xs mt-2">Vence en {countdown}s</p>
            <button
              type="button"
              className="mt-2 text-xs underline"
              onClick={() => {
                setShowPeer(false);
                setPaseQrUrl(null);
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
