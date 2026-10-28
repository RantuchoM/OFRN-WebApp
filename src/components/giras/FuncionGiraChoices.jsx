import React from "react";
import { funcionGiraTagClass } from "../../utils/funcionGira";

const OPTIONS = [
  { id: "", label: "Indiv" },
  { id: "reemplazo", label: "Reemplazo" },
  { id: "refuerzo", label: "Refuerzo" },
  { id: "pasante", label: "Pasante" },
];

export default function FuncionGiraChoices({
  value,
  onChange,
  name = "funcion-gira",
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {OPTIONS.map((opt) => {
        const selected = (value || "") === opt.id;
        return (
          <label
            key={opt.id || "indiv"}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold cursor-pointer ${funcionGiraTagClass(opt.id)} ${
              selected ? "ring-2 ring-offset-1 ring-slate-500" : ""
            }`}
          >
            <input
              type="radio"
              name={name}
              className="accent-current"
              checked={selected}
              onChange={() => onChange(opt.id)}
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
