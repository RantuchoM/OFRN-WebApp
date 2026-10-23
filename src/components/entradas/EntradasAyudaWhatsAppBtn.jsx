import React, { useEffect, useMemo, useState } from "react";
import WhatsAppLink from "../ui/WhatsAppLink";
import { ensureEntradaPdfShareToken } from "../../services/entradaService";
import {
  fechaHoraDesdeConciertoEntrada,
  lugarNombreDesdeConciertoEntrada,
} from "../../utils/entradasConciertoEvento";
import {
  buildEntradasPdfShareUrl,
  formatDiaHoraWhatsAppEntradas,
  normalizePhoneForWhatsApp,
} from "../../utils/entradasWhatsApp";

/**
 * WhatsApp de consulta de ayuda; si hay reserva, incluye link público al PDF.
 */
export default function EntradasAyudaWhatsAppBtn({
  telefono,
  nombre,
  reservaId = null,
  concierto = null,
  cantidad = null,
  className,
  label = "WhatsApp",
  iconSize = 16,
  isDark = false,
}) {
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!reservaId || !normalizePhoneForWhatsApp(telefono)) {
      setPdfUrl(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await ensureEntradaPdfShareToken(reservaId);
        if (!cancelled) setPdfUrl(buildEntradasPdfShareUrl(token));
      } catch {
        if (!cancelled) setPdfUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservaId, telefono]);

  const cuando = useMemo(() => {
    const iso = concierto?.fecha_hora || fechaHoraDesdeConciertoEntrada(concierto);
    return formatDiaHoraWhatsAppEntradas(iso);
  }, [concierto]);
  const lugar = String(concierto?.lugar_nombre || lugarNombreDesdeConciertoEntrada(concierto) || "").trim();
  const cantidadTxt = cantidad == null || cantidad === "" ? "" : String(cantidad).trim();

  if (!normalizePhoneForWhatsApp(telefono)) return null;

  const cls = className || (
    isDark
      ? "inline-flex items-center gap-1 rounded-md border border-emerald-700 px-2 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-950/50"
      : "inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
  );

  return (
    <WhatsAppLink
      phone={telefono}
      nombre={nombre}
      dia={cuando.dia}
      hora={cuando.hora}
      lugar={lugar}
      cantidad={cantidadTxt}
      pdfUrl={pdfUrl}
      prefillEntradasMessage
      label={label}
      iconSize={iconSize}
      className={cls}
      title={
        pdfUrl
          ? "WhatsApp con mensaje y link al PDF"
          : "WhatsApp con mensaje de entradas"
      }
    />
  );
}
