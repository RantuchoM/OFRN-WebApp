import React, { useMemo, useState } from "react";
import { IconUsers } from "../ui/Icons";
import { getInstrumentValue } from "../../utils/instrumentation";
import InstrumentationSummaryModal from "../seating/InstrumentationSummaryModal";

function createEmptyInstrumentationMap() {
  return {
    Fl: 0,
    Ob: 0,
    Cl: 0,
    Fg: 0,
    Cr: 0,
    Tp: 0,
    Tb: 0,
    Tba: 0,
    Tim: 0,
    Perc: 0,
    Har: 0,
    Pno: 0,
    Str: 0,
  };
}

function computeRequired(works) {
  if (!works || works.length === 0) return createEmptyInstrumentationMap();
  const acc = createEmptyInstrumentationMap();

  works.forEach((obra) => {
    const instString =
      obra.instrumentacion_effective || obra.instrumentacion || "";
    if (!instString) return;

    // Primero intentamos interpretar el formato estándar "Timp.+n" / "Perc.xn"
    let percTotalForWork = 0;
    let timVal = 0;
    let percVal = 0;

    const timpMatch = instString.match(/Timp\.\s*(?:\+(\d+))?/i);
    if (timpMatch) {
      timVal = 1;
      const extra = parseInt(timpMatch[1] || "0", 10) || 0;
      percTotalForWork += 1 + extra; // 1 timbal + extras
    }

    const percMatch = instString.match(/Perc(?:\.x(\d+))?/i);
    if (percMatch) {
      const explicitPerc = percMatch[1]
        ? parseInt(percMatch[1], 10) || 0
        : 1;
      percVal = explicitPerc;
      percTotalForWork += explicitPerc;
    }

    // Fallback para strings no estándar: usar parser genérico
    if (!timpMatch && !percMatch) {
      timVal = getInstrumentValue(instString, "timp") || 0;
      percVal = getInstrumentValue(instString, "perc") || 0;
      percTotalForWork = timVal + percVal;
    }

    // Debug detallado de percusión requerida por obra
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[InstrumentationBadges][computeRequired] Percusión obra", {
        obraId: obra.obra_id ?? obra.id,
        title: obra.title,
        instrumentacion_effective: obra.instrumentacion_effective,
        instrumentacion_raw: obra.instrumentacion,
        timVal,
        percVal,
        percTotalForWork,
      });
    }
    const values = {
      Fl: getInstrumentValue(instString, "fl") || 0,
      Ob: getInstrumentValue(instString, "ob") || 0,
      Cl: getInstrumentValue(instString, "cl") || 0,
      Fg: getInstrumentValue(instString, "bn") || 0,
      Cr: getInstrumentValue(instString, "hn") || 0,
      Tp: getInstrumentValue(instString, "tpt") || 0,
      Tb: getInstrumentValue(instString, "tbn") || 0,
      Tba: getInstrumentValue(instString, "tba") || 0,
      // Para requerido máximo: usar total de percusionistas por obra
      Tim: 0,
      Perc: percTotalForWork,
      Har: getInstrumentValue(instString, "harp") || 0,
      Pno: getInstrumentValue(instString, "key") || 0,
      Str: getInstrumentValue(instString, "str") || 0,
    };

    Object.keys(values).forEach((k) => {
      if (values[k] > acc[k]) acc[k] = values[k];
    });
  });

  return acc;
}

function computeConvoked(roster) {
  const acc = createEmptyInstrumentationMap();
  if (!roster || roster.length === 0) return acc;

  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;

    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();

    const add = (key) => {
      acc[key] += 1;
    };

    if (["01", "02", "03", "04"].includes(idInstr)) {
      add("Str");
      return;
    }

    if (name.includes("flaut") || name.includes("picc")) {
      add("Fl");
      return;
    }
    if (name.includes("oboe") || name.includes("corno ing")) {
      add("Ob");
      return;
    }
    if (
      name.includes("clarin") ||
      name.includes("requinto") ||
      name.includes("basset")
    ) {
      add("Cl");
      return;
    }
    if (name.includes("fagot") || name.includes("contraf")) {
      add("Fg");
      return;
    }
    if (name.includes("corno") || name.includes("trompa")) {
      add("Cr");
      return;
    }
    if (name.includes("trompet") || name.includes("fliscorno")) {
      add("Tp");
      return;
    }
    if (name.includes("trombon") || name.includes("trombón")) {
      add("Tb");
      return;
    }
    if (name.includes("tuba") || name.includes("bombard")) {
      add("Tba");
      return;
    }
    if (name.includes("timbal")) {
      add("Tim");
      return;
    }
    if (
      name.includes("perc") ||
      name.includes("bombo") ||
      name.includes("platillo") ||
      name.includes("caja")
    ) {
      add("Perc");
      return;
    }
    if (name.includes("arpa")) {
      add("Har");
      return;
    }
    if (
      name.includes("piano") ||
      name.includes("teclado") ||
      name.includes("celesta") ||
      name.includes("órgano") ||
      name.includes("organo")
    ) {
      add("Pno");
      return;
    }

    if (familia.includes("cuerd")) {
      add("Str");
    }
  });

  return acc;
}

function normalizeForCompare(key, value) {
  if (key === "Str") {
    return value > 0 ? 1 : 0;
  }
  return value || 0;
}

function hasInstrumentationMismatch(required, convoked) {
  const requiredPercTotal = (required.Tim || 0) + (required.Perc || 0);
  const convokedPercTotal = (convoked.Tim || 0) + (convoked.Perc || 0);

  const keys = [
    "Fl",
    "Ob",
    "Cl",
    "Fg",
    "Cr",
    "Tp",
    "Tb",
    "Tba",
    "Perc",
    "Har",
    "Pno",
    "Str",
  ];

  return keys.some((k) => {
    if (k === "Perc") {
      return (
        normalizeForCompare("Perc", requiredPercTotal) !==
        normalizeForCompare("Perc", convokedPercTotal)
      );
    }
    const r = normalizeForCompare(k, required[k] || 0);
    const c = normalizeForCompare(k, convoked[k] || 0);
    return r !== c;
  });
}

function formatInstrumentationStandard(map) {
  const fl = map.Fl || 0;
  const ob = map.Ob || 0;
  const cl = map.Cl || 0;
  const bn = map.Fg || 0;
  const hn = map.Cr || 0;
  const tpt = map.Tp || 0;
  const tbn = map.Tb || 0;
  const tba = map.Tba || 0;

  const percTotal = (map.Tim || 0) + (map.Perc || 0);
  const harpCount = map.Har || 0;
  const keyCount = map.Pno || 0;
  const hasStr = (map.Str || 0) > 0;

  let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

  let percStr = "";
  if (percTotal === 1) percStr = "Perc";
  else if (percTotal > 1) percStr = `Perc.x${percTotal}`;
  if (percStr) standardStr += ` - ${percStr}`;

  if (harpCount > 0)
    standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
  if (keyCount > 0) standardStr += ` - Key`;
  if (hasStr) standardStr += " - Str";

  const isStandardEmpty =
    standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
    percTotal === 0 &&
    !hasStr &&
    harpCount === 0 &&
    keyCount === 0;

  if (isStandardEmpty) return "s/d";

  return standardStr
    .replace("0.0.0.0 - 0.0.0.0 - ", "")
    .replace("0.0.0.0 - 0.0.0.0", "");
}

function renderInstrumentationStandardDiff(map, otherMap) {
  const fl = map.Fl || 0;
  const ob = map.Ob || 0;
  const cl = map.Cl || 0;
  const bn = map.Fg || 0;
  const hn = map.Cr || 0;
  const tpt = map.Tp || 0;
  const tbn = map.Tb || 0;
  const tba = map.Tba || 0;

  const hasTimp = (map.Tim || 0) > 0;
  const percCount = map.Perc || 0;
  const harpCount = map.Har || 0;
  const keyCount = map.Pno || 0;
  const hasStr = (map.Str || 0) > 0;

  const percTotalThis = (map.Tim || 0) + (map.Perc || 0);
  const percTotalOther = (otherMap.Tim || 0) + (otherMap.Perc || 0);

  const shouldHighlight = (key) => {
    if (key === "Tim" || key === "Perc") {
      const thisNorm = normalizeForCompare("Perc", percTotalThis);
      const otherNorm = normalizeForCompare("Perc", percTotalOther);
      return thisNorm > otherNorm;
    }
    const thisNorm = normalizeForCompare(key, map[key] || 0);
    const otherNorm = normalizeForCompare(key, otherMap[key] || 0);
    return thisNorm > otherNorm;
  };

  const tokenNumber = (value, key) => {
    const highlight = shouldHighlight(key);
    const base =
      "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
    const diffClass = highlight
      ? "bg-orange-200 text-black font-extrabold"
      : "text-slate-700";
    return (
      <span key={key} className={`${base} ${diffClass}`}>
        {value}.
      </span>
    );
  };

  const parts = [];

  // Maderas
  parts.push(tokenNumber(fl, "Fl"));
  parts.push(" ");
  parts.push(tokenNumber(ob, "Ob"));
  parts.push(" ");
  parts.push(tokenNumber(cl, "Cl"));
  parts.push(" ");
  parts.push(tokenNumber(bn, "Fg"));

  // Separador
  parts.push(" - ");

  // Metales
  parts.push(tokenNumber(hn, "Cr"));
  parts.push(" ");
  parts.push(tokenNumber(tpt, "Tp"));
  parts.push(" ");
  parts.push(tokenNumber(tbn, "Tb"));
  parts.push(" ");
  parts.push(tokenNumber(tba, "Tba"));

  // Percusión: mostrar siempre como Perc / Perc.xN usando total de instrumentistas
  if (percTotalThis > 0) {
    parts.push(" ");
    const percLabel =
      percTotalThis === 1 ? "Perc" : `Perc.x${percTotalThis}`;
    const percKey = "Perc";
    const highlight = shouldHighlight(percKey);
    const base =
      "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
    const diffClass = highlight
      ? "bg-orange-200 text-black font-extrabold"
      : "text-slate-700";
    parts.push(
      <span key="PercTotal" className={`${base} ${diffClass}`}>
        {percLabel}
      </span>,
    );
  }

  // Arpa / Key / Str
  if (harpCount > 0) {
    parts.push(" ");
    const n = harpCount;
    const label = n > 1 ? `${n} Hp` : "Hp";
    const highlight = shouldHighlight("Har");
    const base =
      "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
    const diffClass = highlight
      ? "bg-orange-200 text-black font-extrabold"
      : "text-slate-700";
    parts.push(
      <span key="Har" className={`${base} ${diffClass}`}>
        {label}
      </span>,
    );
  }

  if (keyCount > 0) {
    parts.push(" ");
    const highlight = shouldHighlight("Pno");
    const base =
      "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
    const diffClass = highlight
      ? "bg-orange-200 text-black font-extrabold"
      : "text-slate-700";
    parts.push(
      <span key="Key" className={`${base} ${diffClass}`}>
        Key
      </span>,
    );
  }

  if (hasStr) {
    parts.push(" ");
    const highlight = shouldHighlight("Str");
    const base =
      "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
    const diffClass = highlight
      ? "bg-orange-200 text-black font-extrabold"
      : "text-slate-700";
    parts.push(
      <span key="Str" className={`${base} ${diffClass}`}>
        Str
      </span>,
    );
  }

  return parts;
}

export default function InstrumentationBadges({
  works = [],
  roster = [],
  className = "",
}) {
  const [showModal, setShowModal] = useState(false);

  const normalizedWorks = useMemo(
    () =>
      (works || []).map((w) => ({
        ...w,
        instrumentacion_effective:
          w.instrumentacion_effective || w.instrumentacion || "",
      })),
    [works],
  );

  const required = useMemo(
    () => computeRequired(normalizedWorks),
    [normalizedWorks],
  );
  const convoked = useMemo(() => computeConvoked(roster), [roster]);

  const mismatch = useMemo(
    () => hasInstrumentationMismatch(required, convoked),
    [required, convoked],
  );

  if (!normalizedWorks || normalizedWorks.length === 0) return null;

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-1 ${className}`.trim()}
      >
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-2 py-0 rounded-full text-[10px] font-semibold border transition-colors max-w-[260px] truncate flex items-center gap-1 bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
          title={formatInstrumentationStandard(convoked)}
        >
          <IconUsers size={12} className="opacity-70" />
          <span className="mr-1">Conv:</span>
          {renderInstrumentationStandardDiff(convoked, required)}
        </button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-2 py-0 rounded-full text-[10px] font-semibold border transition-colors max-w-[260px] truncate flex items-center gap-1 bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
          title={formatInstrumentationStandard(required)}
        >
          <IconUsers size={12} className="opacity-70" />
          <span className="mr-1">Req:</span>
          {renderInstrumentationStandardDiff(required, convoked)}
        </button>
      </div>

      {showModal && (
        <InstrumentationSummaryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          works={normalizedWorks}
          required={required}
          convoked={convoked}
        />
      )}
    </>
  );
}

