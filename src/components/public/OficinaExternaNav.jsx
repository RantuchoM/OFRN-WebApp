import React from "react";
import { Link, useLocation } from "react-router-dom";

const LINKS = [
  {
    to: "/transporte-scrn",
    label: "Transporte",
    match: (path) => path.startsWith("/transporte-scrn"),
  },
  {
    to: "/viaticos-manual",
    label: "Viáticos",
    match: (path) => path.startsWith("/viaticos-manual"),
  },
  {
    to: "/rendiciones-manual",
    label: "Rendiciones",
    match: (path) => path.startsWith("/rendiciones-manual"),
  },
];

/**
 * Tabs entre las tres pantallas de la oficina externa (misma sesión).
 * `tone="scrn"` usa el azul institucional del transporte.
 */
export default function OficinaExternaNav({ tone = "indigo" }) {
  const path = useLocation().pathname || "";
  const activeClass = tone === "scrn" ? "bg-[#0054a6] text-white" : "bg-indigo-600 text-white";
  const idleClass =
    tone === "scrn"
      ? "bg-white text-slate-700 hover:bg-[#e8f1fa]"
      : "bg-transparent text-slate-600 hover:bg-slate-50";

  return (
    <nav
      aria-label="Oficina"
      className={`inline-flex max-w-full shrink-0 overflow-x-auto border bg-white ${
        tone === "scrn" ? "border-[#c5d0dc]" : "rounded-xl border-slate-200 shadow-sm"
      }`}
    >
      {LINKS.map((link, index) => {
        const active = link.match(path);
        return (
          <React.Fragment key={link.to}>
            {index > 0 ? <span className="w-px shrink-0 bg-slate-200" aria-hidden /> : null}
            <Link
              to={link.to}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2 text-xs font-black whitespace-nowrap outline-none focus:ring-2 focus:ring-[#0054a6]/30 ${
                active ? activeClass : idleClass
              }`}
            >
              {link.label}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
