import React from "react";
import {
  getMotivoLugarWarningSections,
  summarizeMotivoLugarGaps,
} from "../../../utils/viaticosExportMotivoLugar";

function AmberField({ children }) {
  return (
    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
      {children}
    </span>
  );
}

export function MotivoLugarExportWarningTitle({ issues }) {
  const { hasMotivo, hasLugar } = summarizeMotivoLugarGaps(issues);
  if (hasMotivo && hasLugar) {
    return (
      <span className="block leading-snug">
        <span className="block">
          Falta el <AmberField>motivo</AmberField> de comisión
        </span>
        <span className="block mt-1">
          Falta el <AmberField>lugar</AmberField> de comisión
        </span>
      </span>
    );
  }
  if (hasMotivo) {
    return (
      <>
        Falta el <AmberField>motivo</AmberField> de comisión
      </>
    );
  }
  if (hasLugar) {
    return (
      <>
        Falta el <AmberField>lugar</AmberField> de comisión
      </>
    );
  }
  return "Datos de comisión incompletos";
}

export function MotivoLugarExportWarningBody({ issues }) {
  const sections = getMotivoLugarWarningSections(issues);
  if (!sections.length) return null;

  return (
    <div className="text-sm text-slate-600 mt-2 leading-relaxed space-y-3">
      {sections.map((section) => (
        <div key={section.key}>
          <p className="font-semibold text-slate-700">
            {section.lead} <AmberField>{section.field}</AmberField>
          </p>
          <p className="mt-1 text-slate-600">{section.summary}</p>
        </div>
      ))}
      <p className="text-xs text-slate-500 leading-relaxed">
        Si hay un valor general en la gira (o en destaques), solo se listan
        quienes no lo heredan.
      </p>
      <p>¿Deseas exportar igual?</p>
    </div>
  );
}
