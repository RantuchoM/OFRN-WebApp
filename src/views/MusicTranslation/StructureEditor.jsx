import React, { useMemo } from "react";
import { LayoutList } from "lucide-react";
import MusicTranslationFittingTextarea from "./MusicTranslationFittingTextarea";
import {
  chunkSegmentsByControlFlow,
  controlFlujoButtonLabel,
  controlFlujoIsParagraph,
  controlFlujoStructureSuperscriptClasses,
  formatStanzaHeading,
  groupSegmentsByStanzaPrefix,
  normalizeControlFlujo,
  structureInterSegmentMarginClass,
} from "../../utils/musicTranslationFlow";
import {
  normalizeRepeticion,
  segmentRimaFieldClasses,
} from "../../utils/musicTranslationPoetics";

function FlowSuperscript({ segment, flow, onCycle, onSegmentContextMenu }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title="Flujo tras este fragmento (clic o Enter en el campo: · ↵ ¶ | “)"
      aria-label={`Control de flujo tras ${segment.segment_name}`}
      className={controlFlujoStructureSuperscriptClasses(flow)}
      onClick={() => onCycle(segment.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSegmentContextMenu?.(e, segment.id);
      }}
    >
      {controlFlujoButtonLabel(flow)}
    </button>
  );
}

const textareaEs =
  "box-border min-h-[2.125rem] min-w-[3ch] resize-none overflow-hidden whitespace-pre-wrap rounded border border-slate-300/90 bg-white px-1.5 py-1 text-sm leading-snug text-slate-900 transition-colors duration-300 [scrollbar-width:none] placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/25 dark:border-slate-500 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 [&::-webkit-scrollbar]:hidden";

const textareaEn =
  "box-border min-h-[2.125rem] min-w-[3ch] resize-none overflow-hidden whitespace-pre-wrap rounded border border-dashed border-slate-500/55 bg-white/75 px-1.5 py-1 text-sm italic leading-snug text-slate-700 transition-colors duration-300 [scrollbar-width:none] placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/25 dark:border-slate-400 dark:bg-slate-950/45 dark:text-slate-300 dark:placeholder:text-slate-500 [&::-webkit-scrollbar]:hidden";

/** Máximo de segmentos por fila visual (misma línea lógica puede partirse en varias subfilas). */
const MAX_SEGMENTS_PER_ROW = 12;

function chunkSegmentsForRowDisplay(segments, maxPerRow) {
  const chunks = [];
  for (let i = 0; i < segments.length; i += maxPerRow) {
    chunks.push(segments.slice(i, i + maxPerRow));
  }
  return chunks;
}

/** Orden de Tab en una fila lógica: recorre solo dentro del idioma. */
function structureRowTabSequence(row, lang) {
  const ids = row.map((s) => s.id);
  return ids.map((id) => ({ lang, id }));
}

function focusStructureField(lang, id) {
  requestAnimationFrame(() => {
    document.getElementById(`music-tr-structure-${lang}-${id}`)?.focus();
  });
}

/** Etiqueta corta (p. ej. exportaciones); la vista estructura no la muestra. */
export function shortSegmentLabel(name) {
  return String(name || "·")
    .replace(/\s*verse\s*/gi, "V")
    .replace(/\s*chorus\s*/gi, "C")
    .replace(/\s+/g, "")
    .replace(/^V/i, "V")
    .replace(/^C/i, "C");
}

/** @deprecated usar `chunkSegmentsByControlFlow` desde `musicTranslationFlow.js` */
export function chunkSegmentsByFinLinea(segments, finLineaById) {
  const flowById = {};
  for (const seg of segments) {
    flowById[seg.id] = finLineaById[seg.id] ? "line" : "none";
  }
  return chunkSegmentsByControlFlow(segments, flowById);
}

/**
 * Vista estructura: estrofas por prefijo; cada línea lógica en **dos mitades** (ES | EN)
 * con fragmentos alineados en columnas. Tab recorre horizontalmente todos los ES de la fila
 * y luego todos los EN (incluye subfilas de 12).
 */
export default function StructureEditor({
  segmentsOrdered,
  spanishById,
  englishById,
  controlFlujoById,
  rimaById = {},
  repeticionById = {},
  onSpanishChange,
  onEnglishChange,
  scheduleSaveSpanish,
  scheduleSaveEnglish,
  onCycleControlFlow,
  onMusicTranslationPaste,
  focusNextSegment,
  flashKeys,
  onSegmentContextMenu,
  onSpanishSegmentFocus,
}) {
  const stanzaGroups = useMemo(
    () => groupSegmentsByStanzaPrefix(segmentsOrdered),
    [segmentsOrdered],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-100/80 dark:bg-slate-950/50">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
        <LayoutList className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="text-sm font-medium leading-snug">
          ES | EN · clic derecho = rima / repetición · recuadro de flujo arriba a la derecha (clic o
          Enter = ciclar) · más junto si el ES previo termina en guion · Tab = siguiente en la fila ·
          Hasta {MAX_SEGMENTS_PER_ROW} por subfila · Foco = selección completa · Espacio/guion →
          siguiente segmento · Shift+Enter = salto en texto
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 dark:border-slate-800">
        <div className="border-r border-slate-200 bg-slate-200/60 px-2 py-1 text-center text-xs font-black uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
          Español
        </div>
        <div className="bg-slate-200/60 px-2 py-1 text-center text-xs font-black uppercase tracking-wider text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
          Inglés
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-0.5">
        {stanzaGroups.map(({ prefix, segments: stanzaSegs }, gi) => (
          <div
            key={`${prefix}-${gi}`}
            className="mb-2 border-b border-slate-200/60 pb-2 last:mb-0 last:border-b-0 last:pb-0 dark:border-slate-700/60"
          >
            <div className="mb-1 rounded-md border-l-4 border-violet-500 bg-slate-800 px-2 py-1.5 text-center text-xs font-black uppercase tracking-wider text-slate-100 shadow-md ring-1 ring-violet-500/35 dark:bg-slate-800 dark:text-slate-100">
              <span className="mr-1.5 text-[11px] font-bold normal-case tracking-normal text-violet-300/90">
                Estrofa
              </span>
              {formatStanzaHeading(prefix)}
            </div>

            {(() => {
              const controlFlowRows = chunkSegmentsByControlFlow(
                stanzaSegs,
                controlFlujoById,
              );
              return controlFlowRows.map((row, ri) => {
                const last = row[row.length - 1];
                const paragraphGap =
                  last && controlFlujoIsParagraph(controlFlujoById[last.id]);

                const rowKeyDown =
                  (segId, lang) => (e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const idxInLine = row.findIndex((s) => s.id === segId);
                      if (idxInLine < 0) return;

                      const nLines = controlFlowRows.length;
                      if (!nLines) return;

                      if (!e.shiftKey) {
                        // Dentro de la misma línea: siguiente segmento.
                        if (idxInLine + 1 < row.length) {
                          const nextSeg = row[idxInLine + 1];
                          if (!nextSeg?.id) return;
                          focusStructureField(lang, nextSeg.id);
                          return;
                        }

                        // Si estoy en el último segmento, paso a la línea siguiente.
                        const nextLine = controlFlowRows[(ri + 1) % nLines] ?? [];
                        const nextSeg = nextLine[0];
                        if (!nextSeg?.id) return;
                        focusStructureField(lang, nextSeg.id);
                        return;
                      }

                      // Shift+Tab:
                      // Dentro de la misma línea: segmento anterior.
                      if (idxInLine - 1 >= 0) {
                        const prevSeg = row[idxInLine - 1];
                        if (!prevSeg?.id) return;
                        focusStructureField(lang, prevSeg.id);
                        return;
                      }

                      // Si estoy en el primero, paso a la línea anterior.
                      const prevLine =
                        controlFlowRows[(ri - 1 + nLines) % nLines] ?? [];
                      const prevSeg = prevLine[prevLine.length - 1];
                      if (!prevSeg?.id) return;
                      focusStructureField(lang, prevSeg.id);
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onCycleControlFlow(segId);
                    }
                  };

                const batches = chunkSegmentsForRowDisplay(
                  row,
                  MAX_SEGMENTS_PER_ROW,
                );

                return (
                  <div
                    key={ri}
                    className={
                      paragraphGap
                        ? "mb-5"
                        : "mb-0.5 border-b border-slate-200/70 pb-0.5 last:mb-0 last:border-b-0 last:pb-0 dark:border-slate-700/80"
                    }
                  >
                    {batches.map((batch, bi) => (
                      <div
                        key={`${ri}-${bi}`}
                        className={`flex min-w-0 gap-1 bg-white/90 px-0.5 py-0.5 dark:bg-slate-900/90 ${bi > 0 ? "mt-1 border-t border-slate-100 pt-1 dark:border-slate-800" : ""}`}
                      >
                        <div className="flex min-w-0 flex-1 flex-row items-stretch border-r border-slate-200 pr-1 dark:border-slate-700">
                          {batch.map((seg, si) => {
                            const flow = normalizeControlFlujo(
                              controlFlujoById[seg.id],
                            );
                            const boxFlash = flashKeys.has(`box-${seg.id}`);
                            const rimaTint = segmentRimaFieldClasses(
                              rimaById[seg.id],
                            );
                            const repCode = normalizeRepeticion(
                              repeticionById[seg.id],
                            );
                            const mlClass =
                              si > 0
                                ? structureInterSegmentMarginClass(
                                    spanishById[batch[si - 1].id] ?? "",
                                  )
                                : "";
                            return (
                              <div
                                key={`${seg.id}-es-row`}
                                className={`relative flex w-max max-w-full min-w-0 flex-none flex-col ${mlClass}`}
                              >
                                {repCode && (
                                  <span className="pointer-events-none absolute left-0 top-0 z-[15] rounded-br-md bg-slate-800 px-1 py-px text-[9px] font-bold leading-none text-white shadow-sm dark:bg-slate-700">
                                    {repCode}
                                  </span>
                                )}
                                <div className="flex h-3.5 w-full min-w-0 shrink-0 items-start justify-end pr-px pt-px">
                                  <FlowSuperscript
                                    segment={seg}
                                    flow={flow}
                                    onCycle={onCycleControlFlow}
                                    onSegmentContextMenu={onSegmentContextMenu}
                                  />
                                </div>
                                <div
                                  className={`w-max max-w-full min-w-0 shrink-0 rounded p-px transition-colors duration-300 ${
                                    rimaTint ? `${rimaTint} border` : ""
                                  } ${
                                    boxFlash
                                      ? "bg-green-500/20 dark:bg-green-500/15"
                                      : ""
                                  }`}
                                >
                                  <MusicTranslationFittingTextarea
                                    id={`music-tr-structure-es-${seg.id}`}
                                    minFontPx={9}
                                    maxFontPx={16}
                                    fitHeightOnly
                                    autoWidth
                                    segmentLang="es"
                                    segmentId={seg.id}
                                    focusNextSegment={focusNextSegment}
                                    aria-label={`Español: ${seg.segment_name}`}
                                    rows={1}
                                    placeholder="…"
                                    value={spanishById[seg.id] ?? ""}
                                    onFocus={() => onSpanishSegmentFocus?.(seg.id)}
                                    onChange={(e) => {
                                      onSpanishChange(seg.id, e.target.value);
                                      scheduleSaveSpanish(
                                        seg.id,
                                        e.target.value,
                                      );
                                    }}
                                    onKeyDown={rowKeyDown(seg.id, "es")}
                                    onPaste={(e) =>
                                      onMusicTranslationPaste?.(
                                        e,
                                        "es",
                                        seg.id,
                                      )
                                    }
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      onSegmentContextMenu?.(e, seg.id);
                                    }}
                                    spellCheck={false}
                                    className={`${textareaEs} ${
                                      flashKeys.has(`sp-${seg.id}`)
                                        ? "bg-green-500/25 dark:bg-green-500/20"
                                        : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-1 flex-row items-stretch overflow-x-auto rounded bg-slate-100/65 px-1 py-0.5 dark:bg-slate-800/40">
                          {batch.map((seg, si) => {
                            const flow = normalizeControlFlujo(
                              controlFlujoById[seg.id],
                            );
                            const boxFlash = flashKeys.has(`box-${seg.id}`);
                            const rimaTint = segmentRimaFieldClasses(
                              rimaById[seg.id],
                            );
                            const mlClass =
                              si > 0
                                ? structureInterSegmentMarginClass(
                                    spanishById[batch[si - 1].id] ?? "",
                                  )
                                : "";
                            return (
                              <div
                                key={`${seg.id}-en-row`}
                                className={`flex w-max max-w-full min-w-0 flex-none flex-col ${mlClass}`}
                              >
                                <div className="flex h-3.5 w-full min-w-0 shrink-0 items-start justify-end pr-px pt-px">
                                  <FlowSuperscript
                                    segment={seg}
                                    flow={flow}
                                    onCycle={onCycleControlFlow}
                                    onSegmentContextMenu={onSegmentContextMenu}
                                  />
                                </div>
                                <div
                                  className={`w-max max-w-full min-w-0 shrink-0 rounded p-px transition-colors duration-300 ${
                                    rimaTint ? `${rimaTint} border` : ""
                                  } ${
                                    boxFlash
                                      ? "bg-green-500/20 dark:bg-green-500/15"
                                      : ""
                                  }`}
                                >
                                  <MusicTranslationFittingTextarea
                                    id={`music-tr-structure-en-${seg.id}`}
                                    minFontPx={9}
                                    maxFontPx={16}
                                    fitHeightOnly
                                    autoWidth
                                    segmentLang="en"
                                    segmentId={seg.id}
                                    focusNextSegment={focusNextSegment}
                                    aria-label={`Inglés: ${seg.segment_name}`}
                                    rows={1}
                                    placeholder="…"
                                    value={
                                      englishById[seg.id] ??
                                      seg.segment_english ??
                                      ""
                                    }
                                    onChange={(e) => {
                                      onEnglishChange(seg.id, e.target.value);
                                      scheduleSaveEnglish(
                                        seg.id,
                                        e.target.value,
                                      );
                                    }}
                                    onKeyDown={rowKeyDown(seg.id, "en")}
                                    onPaste={(e) =>
                                      onMusicTranslationPaste?.(
                                        e,
                                        "en",
                                        seg.id,
                                      )
                                    }
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      onSegmentContextMenu?.(e, seg.id);
                                    }}
                                    spellCheck={false}
                                    className={`${textareaEn} ${
                                      flashKeys.has(`en-${seg.id}`)
                                        ? "bg-green-500/25 dark:bg-green-500/20"
                                        : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
