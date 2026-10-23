import React from "react";
import { normalizePhoneForWhatsApp } from "../../utils/whatsappPhone";
import { IconWhatsAppFilled } from "./Icons";

export { normalizePhoneForWhatsApp };

/**
 * Enlace a WhatsApp (wa.me) con número normalizado.
 * Usar para teléfonos de músicos, roster, entradas de terceros, etc.
 *
 * @param {string} phone - Teléfono (se normaliza con normalizePhoneForWhatsApp)
 * @param {string} [message] - Texto precargado del chat (?text=)
 * @param {React.ReactNode} [children] - Contenido del enlace; si no se pasa, se muestra el icono
 * @param {string} [label] - Texto junto al icono
 * @param {string} [className] - Clases CSS del <a>
 * @param {number} [iconSize=16] - Tamaño del icono cuando no hay children
 * @param {string} [title] - title del enlace (accesibilidad)
 * @param {function} [onClick] - Se ejecuta además de abrir el chat (no cancela la navegación salvo preventDefault)
 */
export default function WhatsAppLink({
  phone,
  message,
  children,
  label,
  className = "text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-full transition-colors ml-1 shrink-0 inline-flex items-center justify-center",
  iconSize = 16,
  title = "Enviar WhatsApp",
  onClick,
}) {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  if (!cleanPhone) return null;

  const text = String(message || "").trim();
  const url = text
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {children != null ? children : <IconWhatsAppFilled size={iconSize} />}
      {label && <span className="ml-1">{label}</span>}
    </a>
  );
}
