import React, { useMemo, useState } from "react";
import { IconUsers, IconCheckCircle, IconInfo } from "../ui/Icons";
import {
  getInstrumentValue,
  countsTowardInstrumentationConvoked,
  rosterHasInstrumentationMembers,
  getInstrumentationBadgeBaseClass,
} from "../../utils/instrumentation";
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

export function computeRequired(works) {
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

export function computeConvoked(roster) {
  const acc = createEmptyInstrumentationMap();
  if (!roster || roster.length === 0) return acc;

  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;
    if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;

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

function percTotalOf(map) {
  return (map?.Tim || 0) + (map?.Perc || 0);
}

function percLabelOf(total) {
  if (total <= 0) return "";
  return total === 1 ? "Perc" : `Perc.x${total}`;
}

function harpLabelOf(count) {
  if (count <= 0) return "";
  return count > 1 ? `${count} Hp` : "Hp";
}

function extraColumnKeys(convoked, required, includeRequired) {
  const maps = includeRequired ? [convoked, required] : [convoked];
  const extras = [];
  if (maps.some((m) => percTotalOf(m) > 0)) extras.push("Perc");
  if (maps.some((m) => (m.Har || 0) > 0)) extras.push("Har");
  if (maps.some((m) => (m.Pno || 0) > 0)) extras.push("Pno");
  if (maps.some((m) => (m.Str || 0) > 0)) extras.push("Str");
  return extras;
}

function shouldHighlightKey(key, map, otherMap, skipDiffHighlight) {
  if (skipDiffHighlight) return false;
  if (key === "Perc") {
    const thisNorm = normalizeForCompare("Perc", percTotalOf(map));
    const otherNorm = normalizeForCompare("Perc", percTotalOf(otherMap));
    return thisNorm > otherNorm;
  }
  const thisNorm = normalizeForCompare(key, map[key] || 0);
  const otherNorm = normalizeForCompare(key, otherMap[key] || 0);
  return thisNorm > otherNorm;
}

function AlignmentToken({ children, highlight, highlightClass, wide = false }) {
  const empty = children == null || children === "";
  return (
    <span
      className={`inline-flex items-center w-full rounded-sm px-0.5 py-0 text-[9px] leading-none tabular-nums ${
        wide ? "justify-start min-w-[2.6em]" : "justify-center min-w-[1.15em]"
      } ${
        empty
          ? "invisible"
          : highlight
            ? highlightClass
            : "text-slate-700"
      }`}
    >
      {empty ? "\u00a0" : children}
    </span>
  );
}

function renderAlignedRowTokens(
  map,
  otherMap,
  extraKeys,
  highlightClass,
  skipDiffHighlight,
  rowKey,
) {
  const cells = [];
  const pushNum = (key) => {
    cells.push(
      <AlignmentToken
        key={`${rowKey}-${key}`}
        highlight={shouldHighlightKey(key, map, otherMap, skipDiffHighlight)}
        highlightClass={highlightClass}
      >
        {`${map[key] || 0}.`}
      </AlignmentToken>,
    );
  };

  ["Fl", "Ob", "Cl", "Fg"].forEach(pushNum);
  cells.push(
    <span
      key={`${rowKey}-dash`}
      className="px-0.5 text-[9px] leading-none text-slate-500"
    >
      -
    </span>,
  );
  ["Cr", "Tp", "Tb", "Tba"].forEach(pushNum);

  extraKeys.forEach((key) => {
    let label = "";
    if (key === "Perc") label = percLabelOf(percTotalOf(map));
    else if (key === "Har") label = harpLabelOf(map.Har || 0);
    else if (key === "Pno") label = (map.Pno || 0) > 0 ? "Key" : "";
    else if (key === "Str") label = (map.Str || 0) > 0 ? "Str" : "";

    cells.push(
      <AlignmentToken
        key={`${rowKey}-${key}`}
        wide={key === "Perc"}
        highlight={shouldHighlightKey(key, map, otherMap, skipDiffHighlight)}
        highlightClass={highlightClass}
      >
        {label}
      </AlignmentToken>,
    );
  });

  return cells;
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

export default function InstrumentationBadges({
  works = [],
  roster = [],
  className = "",
  organicoRevisado = false,
  organicoComentario = null,
  programId = null,
  repertorioId = null,
  supabase = null,
  onOrganicoSave = null,
  scopeLabel = null,
  repertoireBlocks = [],
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

  const hasVacancies = useMemo(
    () => (roster || []).some((r) => !!r.es_simulacion),
    [roster],
  );

  const hasWorks = normalizedWorks.length > 0;
  const hasConvocableMembers = useMemo(
    () => rosterHasInstrumentationMembers(roster),
    [roster],
  );

  const badgeBaseClass = getInstrumentationBadgeBaseClass({
    hasWorks,
    organicoRevisado,
    mismatch,
    hasVacancies,
  });

  if (!hasWorks && !hasConvocableMembers) return null;

  const convTitle = formatInstrumentationStandard(convoked);
  const reqTitle = hasWorks ? formatInstrumentationStandard(required) : "";
  const extraKeys = extraColumnKeys(convoked, required, hasWorks);
  const highlightClass = organicoRevisado
    ? "bg-sky-200 text-sky-800 font-extrabold"
    : "bg-orange-200 text-black font-extrabold";
  const extraColCss = extraKeys
    .map((k) => (k === "Perc" ? "minmax(2.6em,auto)" : "minmax(1.5em,auto)"))
    .join(" ");
  const gridTemplateColumns = [
    "auto",
    "auto",
    "repeat(4, minmax(1.15em, auto))",
    "auto",
    "repeat(4, minmax(1.15em, auto))",
    extraColCss,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={`flex items-center gap-1 min-w-0 ${className}`.trim()}
      >
        {organicoRevisado && (
          <IconCheckCircle
            size={14}
            className="text-sky-600 shrink-0"
            title="Adaptación validada"
          />
        )}
        {organicoComentario && (
          <span
            className="text-blue-600 cursor-help shrink-0"
            title={organicoComentario}
          >
            <IconInfo size={14} />
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-grid gap-x-0.5 gap-y-px items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border text-left transition-colors min-w-0 max-w-full overflow-x-auto ${badgeBaseClass}`}
          style={{ gridTemplateColumns }}
          title={reqTitle ? `${convTitle}\n${reqTitle}` : convTitle}
        >
          <IconUsers
            size={12}
            className={`opacity-70 shrink-0 self-center ${hasWorks ? "row-span-2" : ""}`}
          />
          <span className="leading-tight shrink-0">Conv:</span>
          {renderAlignedRowTokens(
            convoked,
            required,
            extraKeys,
            highlightClass,
            !hasWorks,
            "conv",
          )}
          {hasWorks && (
            <>
              <span className="leading-tight shrink-0">Req:</span>
              {renderAlignedRowTokens(
                required,
                convoked,
                extraKeys,
                highlightClass,
                false,
                "req",
              )}
            </>
          )}
        </button>
      </div>

      {showModal && (
        <InstrumentationSummaryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          works={normalizedWorks}
          required={required}
          convoked={convoked}
          roster={roster}
          programId={programId}
          repertorioId={repertorioId}
          supabase={supabase}
          organicoRevisado={organicoRevisado}
          organicoComentario={organicoComentario}
          onOrganicoSave={onOrganicoSave}
          scopeLabel={scopeLabel}
          repertoireBlocks={repertoireBlocks}
        />
      )}
    </>
  );
}

