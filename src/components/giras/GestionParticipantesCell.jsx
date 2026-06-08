import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  sortEnsamblesParticipantes,
  sortFamiliasParticipantes,
} from "../../utils/participantesSort";

const FONT_PX = [10, 9, 8];

function ParticipantesSegments({ tone, items, fontPx, fillColumn }) {
  return items.map((item, idx) => (
    <span
      key={item.key}
      title={item.title}
      style={{ fontSize: fontPx }}
      className={`inline-flex items-center justify-center text-center px-1.5 py-0.5 font-mono font-medium uppercase leading-tight tracking-wide ${
        fillColumn ? "min-w-0 flex-1" : "shrink-0"
      } ${idx > 0 ? `border-l ${tone.border}` : ""} ${
        item.className || `${tone.bg} ${tone.text}`
      }`}
    >
      <span className={fillColumn ? "truncate" : ""}>{item.text}</span>
    </span>
  ));
}

function ParticipantesBarRow({ tone, items = [] }) {
  const wrapRef = useRef(null);
  const measureRef = useRef(null);
  const [layout, setLayout] = useState({ fontPx: FONT_PX[0], fillColumn: false });

  const remeasure = useCallback(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const columnW = wrap.clientWidth;
    if (columnW <= 0) return;

    measure.style.fontSize = `${FONT_PX[0]}px`;
    const overflowAtDefault = measure.scrollWidth > columnW;

    let fontPx = FONT_PX[0];
    if (overflowAtDefault) {
      for (let i = 0; i < FONT_PX.length; i += 1) {
        fontPx = FONT_PX[i];
        measure.style.fontSize = `${fontPx}px`;
        if (measure.scrollWidth <= columnW) break;
      }
    }

    setLayout({
      fontPx,
      fillColumn: overflowAtDefault,
    });
  }, [items]);

  useLayoutEffect(() => {
    remeasure();
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const ro = new ResizeObserver(remeasure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [items, remeasure]);

  if (items.length === 0) return null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        ref={measureRef}
        aria-hidden
        className={`pointer-events-none invisible absolute inline-flex w-max whitespace-nowrap ${tone.border}`}
      >
        {items.map((item, idx) => (
          <span
            key={item.key}
            className={`inline-flex shrink-0 items-center justify-center px-1.5 py-0.5 font-mono font-medium uppercase leading-tight tracking-wide ${
              idx > 0 ? `border-l ${tone.border}` : ""
            }`}
          >
            {item.text}
          </span>
        ))}
      </div>
      <div
        className={`inline-flex max-w-full items-stretch overflow-hidden rounded border ${tone.border} ${
          layout.fillColumn ? "w-full" : "w-fit"
        }`}
      >
        <ParticipantesSegments
          tone={tone}
          items={items}
          fontPx={layout.fontPx}
          fillColumn={layout.fillColumn}
        />
      </div>
    </div>
  );
}

const FAMILIA_TONE = {
  border: "border-fixed-indigo-200",
  bg: "bg-fixed-indigo-50",
  text: "text-fixed-indigo-700",
};

const ENSAMBLE_TONE = {
  border: "border-emerald-200",
  bg: "bg-emerald-50",
  text: "text-emerald-700",
};

export default function GestionParticipantesCell({
  participantesEnsamble = [],
  participantesFamilia = [],
}) {
  const sortedEnsambles = sortEnsamblesParticipantes(participantesEnsamble);
  const sortedFamilias = sortFamiliasParticipantes(participantesFamilia);

  const familiaItems = sortedFamilias.map((name) => ({
    key: `fam-${name}`,
    text: name,
  }));

  const ensambleItems = sortedEnsambles.map((ens) => ({
    key: `ens-${ens.excluido ? "exc" : "inc"}-${ens.id ?? ens.nombre}`,
    text: ens.nombre,
    ...(ens.excluido
      ? {
          className: "bg-red-50 text-red-700 line-through opacity-90",
          title: "Ensamble excluido del programa",
        }
      : {}),
  }));

  if (familiaItems.length === 0 && ensambleItems.length === 0) {
    return "-";
  }

  return (
    <div className="space-y-1">
      {familiaItems.length > 0 ? (
        <ParticipantesBarRow tone={FAMILIA_TONE} items={familiaItems} />
      ) : null}
      {ensambleItems.length > 0 ? (
        <ParticipantesBarRow tone={ENSAMBLE_TONE} items={ensambleItems} />
      ) : null}
    </div>
  );
}
