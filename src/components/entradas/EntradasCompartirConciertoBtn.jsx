import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconCopy, IconShare } from "../ui/Icons";
import { linkCatalogoConcierto } from "../../services/entradaService";

const actionBtn =
  "entradas-catalog-control entradas-btn-secondary entradas-interactive inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold disabled:opacity-60";

export default function EntradasCompartirConciertoBtn({ concierto }) {
  const [busy, setBusy] = useState(false);

  const url = useMemo(() => linkCatalogoConcierto(concierto), [concierto]);

  const sharePayload = useMemo(() => {
    const title = String(concierto?.nombre || "Concierto").trim();
    return {
      title,
      text: `Reservá entradas: ${title}`,
      url,
    };
  }, [concierto?.nombre, url]);

  const canNativeShare = useMemo(() => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
    if (typeof navigator.canShare === "function") return navigator.canShare(sharePayload);
    return true;
  }, [sharePayload]);

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await navigator.share(sharePayload);
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error(err?.message || "No se pudo abrir el menú para compartir.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full gap-2">
      {canNativeShare && (
        <button type="button" disabled={busy} className={actionBtn} onClick={() => void handleShare()}>
          <IconShare size={16} aria-hidden />
          Compartir
        </button>
      )}
      <button type="button" disabled={busy} className={actionBtn} onClick={() => void handleCopy()}>
        <IconCopy size={16} aria-hidden />
        Copiar enlace
      </button>
    </div>
  );
}
