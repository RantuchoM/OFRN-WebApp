import React from "react";
import { formatRolGiraLabel } from "../../utils/giraUtils";
import { funcionGiraTagClass, rosterFuncionTag } from "../../utils/funcionGira";

function hexToRgba(hex, alpha = 0.22) {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return null;
  let chars = hex.slice(1).split("");
  if (chars.length === 3) {
    chars = [chars[0], chars[0], chars[1], chars[1], chars[2], chars[2]];
  }
  const n = Number.parseInt(chars.join(""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Chip de rol (color de `roles`) y tag de función, como en la nómina. */
export default function RosterRolFuncionTags({
  person,
  rolesList,
  className = "",
}) {
  if (!person) return null;
  const rolId = person.rol_gira ?? person.rol ?? person.rol_roster ?? "";
  const tag = rosterFuncionTag({ ...person, rol_gira: rolId || person.rol_gira });
  const roleLabel = formatRolGiraLabel(rolId);
  const role = (rolesList || []).find(
    (r) => String(r.id).toLowerCase() === String(rolId).toLowerCase(),
  );
  const tint = role?.color ? hexToRgba(role.color) : null;
  if (!roleLabel && !tag) return null;

  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-1 ${className}`}>
      {roleLabel ? (
        <span
          className={`inline-flex max-w-full truncate items-center rounded border px-1 py-px text-[8px] font-bold uppercase leading-none tracking-tight ${
            tint ? "" : "border-slate-300 bg-slate-100 text-slate-600"
          }`}
          style={
            tint
              ? {
                  backgroundColor: tint,
                  borderColor: role.color,
                  color: "#1e293b",
                }
              : undefined
          }
        >
          {roleLabel}
        </span>
      ) : null}
      {tag ? (
        <span
          className={`inline-flex max-w-full truncate items-center rounded border px-1 py-px text-[8px] font-bold uppercase leading-none tracking-tight ${funcionGiraTagClass(tag.id)}`}
          title={tag.label}
        >
          {tag.label}
        </span>
      ) : null}
    </span>
  );
}
