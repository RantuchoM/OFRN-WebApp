import React from "react";
import { IconWhatsAppFilled } from "./Icons";
import { buildEntradasWhatsAppUrl } from "../../utils/entradasWhatsApp";

export { normalizePhoneForWhatsApp } from "../../utils/entradasWhatsApp";

/**
 * Enlace a WhatsApp (whatsapp:// → app de escritorio/móvil; AR si falta país).
 * Con `prefillEntradasMessage` agrega el texto de envío de entradas.
 */
export default function WhatsAppLink({
  phone,
  nombre,
  dia,
  hora,
  lugar,
  cantidad,
  message,
  pdfUrl = null,
  prefillEntradasMessage = false,
  preferWeb = false,
  children,
  label,
  className = "text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-full transition-colors ml-1 shrink-0 inline-flex items-center justify-center",
  iconSize = 16,
  title = "Enviar WhatsApp",
}) {
  const withText = Boolean(prefillEntradasMessage) || message != null;
  const url = buildEntradasWhatsAppUrl(phone, {
    nombre,
    dia,
    hora,
    lugar,
    cantidad,
    message: withText ? message : undefined,
    withText,
    pdfUrl: pdfUrl || undefined,
    preferWeb,
  });
  if (!url) return null;

  const isAppProtocol = String(url).startsWith("whatsapp:");

  return (
    <a
      href={url}
      // whatsapp:// no debe ir a pestaña nueva: Windows abre la app de escritorio.
      {...(isAppProtocol
        ? {}
        : { target: "_blank", rel: "noopener noreferrer" })}
      className={className}
      title={title}
      onClick={(e) => e.stopPropagation()}
    >
      {children != null ? children : <IconWhatsAppFilled size={iconSize} />}
      {label && <span className="ml-1">{label}</span>}
    </a>
  );
}
