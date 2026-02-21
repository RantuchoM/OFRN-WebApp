import React from "react";
import { IconWhatsAppFilled } from "./Icons";

/**
 * Normaliza un número para wa.me: solo dígitos; si son 10 dígitos o empieza con 0,
 * se antepone 549 (Argentina).
 * @param {string} phone - Número tal como está en el formulario
 * @returns {string} Número listo para wa.me (o '' si no hay número válido)
 */
export function normalizePhoneForWhatsApp(phone) {
  if (!phone || typeof phone !== "string") return "";
  let clean = phone.replace(/\D/g, "");
  if (clean.length === 10) clean = `549${clean}`;
  else if (clean.startsWith("0")) clean = `549${clean.substring(1)}`;
  return clean;
}

/**
 * Enlace a WhatsApp (wa.me) con número normalizado.
 * Usar para teléfonos de músicos, roster, etc.
 *
 * @param {string} phone - Teléfono (se normaliza con normalizePhoneForWhatsApp)
 * @param {React.ReactNode} [children] - Contenido del enlace; si no se pasa, se muestra el icono
 * @param {string} [label] - No usado si hay children; se puede usar como texto junto al icono
 * @param {string} [className] - Clases CSS del <a>
 * @param {number} [iconSize=16] - Tamaño del icono cuando no hay children
 * @param {string} [title] - title del enlace (accesibilidad)
 */
export default function WhatsAppLink({
  phone,
  children,
  label,
  className = "text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-full transition-colors ml-1 shrink-0 inline-flex items-center justify-center",
  iconSize = 16,
  title = "Enviar WhatsApp",
}) {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  if (!cleanPhone) return null;

  const url = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
      onClick={(e) => e.stopPropagation()}
    >
      {children != null ? children : <IconWhatsAppFilled size={iconSize} />}
      {label && <span className="ml-1">{label}</span>}
    </a>
  );
}
