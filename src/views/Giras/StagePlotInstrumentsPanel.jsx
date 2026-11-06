import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  IconChevronDown,
  IconLoader,
  IconMusic,
  IconDownload,
  IconPencil,
  IconPlus,
  IconUpload,
  IconX,
} from "../../components/ui/Icons";
import { matchesMultiTokenSearch } from "../../utils/sanitize";
import {
  createInstrumento,
  findInstrumentosByStagePlotType,
  groupInstrumentosByFamilia,
  instrumentHasStagePlotIcon,
  listInstrumentosFamilias,
  normalizeInstrumentStagePlotType,
  partitionInstrumentosByStagePlotIcon,
  prepareInstrumentSvgIconForSave,
  reloadStagePlotInstrumentIcons,
  saveInstrumentoSvgIcon,
  applyStagePlotInstrumentSizeOverride,
  resolveInstrumentStagePlotType,
  saveInstrumentosTimpaniFootprints,
  setInstrumentoStagePlotRaster,
  clearInstrumentoStagePlotRaster,
  STAGE_PLOT_INSTRUMENT_TYPE_OPTIONS,
} from "../../services/stagePlotInstrumentIconsService";
import {
  listElementosEscenario,
  upsertElementoEscenario,
} from "../../services/stagePlotInventarioService";
import {
  getStagePlotCatalogItem,
  STAGE_PLOT_SOLOIST_TYPES,
} from "../../utils/stagePlotCatalog";
import {
  classifyStagePlotIconUpload,
  downloadStagePlotRasterUrl,
  downloadStagePlotSvgMarkup,
  stagePlotRasterDownloadExt,
  validateStagePlotRasterFile,
  STAGE_PLOT_FILE_INPUT_CLASS,
  STAGE_PLOT_RASTER_HINT,
} from "../../utils/stagePlotRaster";
import {
  resolveStagePlotIconSvgMarkup,
  setStagePlotTimpaniSizeOverrides,
  stagePlotIconImgSrc,
} from "../../utils/stagePlotIconAssets";
import {
  STAGE_PLOT_TIMPANI_SIZES,
  STAGE_PLOT_TIMPANI_SIZE_DEFAULT,
  parseStagePlotTimpaniSizesJson,
  stagePlotTimpaniSizesJson,
} from "../../utils/stagePlotConstants";
import { stagePlotSilhouetteSvgMarkup } from "../../utils/stagePlotSilhouettes";
import {
  sanitizeStagePlotSvgMarkup,
  stagePlotSvgToDataUrl,
  STAGE_PLOT_SVG_MAX_CHARS,
  formatStagePlotSvgMaxChars,
} from "../../utils/stagePlotSvgSanitize";

const TYPE_LABEL = new Map(
  STAGE_PLOT_INSTRUMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const PANEL_TYPE_OPTIONS = STAGE_PLOT_INSTRUMENT_TYPE_OPTIONS;

function normalizeForTypeMatch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Sugiere slug de ícono a partir del nombre (clave interna, no familia).
 */
function suggestStagePlotTypeFromName(instrumentoNombre) {
  const n = normalizeForTypeMatch(instrumentoNombre);
  if (!n) return null;
  let best = null;
  let bestLen = 0;
  for (const o of PANEL_TYPE_OPTIONS) {
    const valueKey = normalizeForTypeMatch(o.value);
    const labelKey = normalizeForTypeMatch(o.label);
    const hit =
      (valueKey && (n === valueKey || n.includes(valueKey))) ||
      (labelKey && (n === labelKey || n.includes(labelKey)));
    if (!hit) continue;
    const score = Math.max(valueKey.length, labelKey.length);
    if (score > bestLen) {
      bestLen = score;
      best = o;
    }
  }
  return best;
}

function stagePlotRowDownloadName(row) {
  return row?.instrumento || row?.stage_plot_type || row?.id || "icono";
}

function formatPanelCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 10) / 10);
}

function parsePanelCm(raw) {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

function timpaniFieldsFromRow(row) {
  const baseW =
    Number(row?.stage_plot_width_cm) > 0 ? Number(row.stage_plot_width_cm) : 50;
  const baseH =
    Number(row?.stage_plot_height_cm) > 0 ? Number(row.stage_plot_height_cm) : 50;
  const stored = parseStagePlotTimpaniSizesJson(row?.stage_plot_timpani_sizes);
  const next = {};
  for (const size of STAGE_PLOT_TIMPANI_SIZES) {
    const dims =
      size === STAGE_PLOT_TIMPANI_SIZE_DEFAULT
        ? { widthCm: baseW, heightCm: baseH }
        : stored.get(size) || {
            widthCm: (baseW * size) / STAGE_PLOT_TIMPANI_SIZE_DEFAULT,
            heightCm: (baseH * size) / STAGE_PLOT_TIMPANI_SIZE_DEFAULT,
          };
    next[size] = {
      width: formatPanelCm(dims.widthCm),
      height: formatPanelCm(dims.heightCm),
    };
  }
  return next;
}

function previewSrcFromMarkup(svg) {
  if (!svg) return null;
  const r = sanitizeStagePlotSvgMarkup(svg);
  if (!r.ok || !r.svg) return null;
  return stagePlotSvgToDataUrl(r.svg, "#1e293b");
}

/** Etiqueta corta del dibujo que el plano muestra hoy. */
function stagePlotIconStatusLabel(row, typeLabel) {
  const hasType = Boolean(String(row?.stage_plot_type || "").trim());
  const hasRaster = Boolean(String(row?.stage_plot_raster_url || "").trim());
  const hasSvg = Boolean(String(row?.svg_icon || "").trim());
  if (hasRaster && hasType) return "PNG";
  if (hasSvg && hasType) return "SVG";
  if (hasType && instrumentHasStagePlotIcon(row)) return typeLabel(row.stage_plot_type);
  if (!hasType && hasRaster) return "PNG sin clave";
  if (!hasType && hasSvg) return "SVG sin clave";
  if (hasType) return "sin visual";
  return "sin ícono";
}

/** Thumbnail: PNG/WebP de la fila → SVG de la fila → estático → silueta. */
function InstrumentSvgThumb({ type, svgIcon, rasterUrl, className = "h-10 w-10" }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (rasterUrl) {
      setSrc(rasterUrl);
      return undefined;
    }
    const fromRow = previewSrcFromMarkup(svgIcon);
    if (fromRow) {
      setSrc(fromRow);
      return undefined;
    }
    const staticUrl = type ? stagePlotIconImgSrc(type) : null;
    if (staticUrl) {
      setSrc(staticUrl);
      return undefined;
    }
    (async () => {
      const markup =
        (await resolveStagePlotIconSvgMarkup(type)) ||
        (type ? stagePlotSilhouetteSvgMarkup(type, "#1e293b", 40) : null);
      if (cancelled) return;
      setSrc(previewSrcFromMarkup(markup) || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [type, svgIcon, rasterUrl]);

  if (!src) {
    return (
      <div
        className={`${className} flex items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400`}
        aria-hidden
      >
        <IconMusic size={16} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`${className} object-contain rounded border border-slate-100 bg-slate-50 p-0.5`}
    />
  );
}

function SvgCompareThumb({ label, src, emptyLabel }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const showImg = Boolean(src) && !broken;
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {showImg ? (
        <img
          src={src}
          alt={label}
          onError={() => setBroken(true)}
          className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-1 text-center text-[10px] text-slate-400">
          {src && broken ? "Sin preview" : emptyLabel}
        </div>
      )}
    </div>
  );
}

function InstrumentRowList({
  rows,
  selectedId,
  setSelectedId,
  typeLabel,
  canEdit,
  savingSize,
  savingSvg,
  savingFamilia,
  familias,
  widthCm,
  setWidthCm,
  heightCm,
  setHeightCm,
  saveSize,
  timpaniFields,
  setTimpaniFields,
  saveTimpaniSizes,
  saveType,
  saveFamilia,
  requestSvgChange,
  uploadRaster,
  clearRaster,
}) {
  if (rows.length === 0) return null;
  const groups = groupInstrumentosByFamilia(rows);
  return (
    <div className="flex flex-col gap-2">
      {groups.map(({ familia, rows: groupRows }) => (
        <div key={familia}>
          <p className="mb-0.5 px-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            {familia}
          </p>
          <ul className="flex flex-col gap-0.5">
            {groupRows.map((row) => {
              const active = String(row.id) === String(selectedId);
              const hasIcon = instrumentHasStagePlotIcon(row);
              const suggestedType =
                !row.stage_plot_type &&
                suggestStagePlotTypeFromName(row.instrumento);
              const famLabel = row.familia?.trim() || "Sin familia";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId((id) =>
                        String(id) === String(row.id) ? null : row.id,
                      )
                    }
                    className={`flex w-full items-center gap-2 rounded border px-1.5 py-1 text-left transition-colors ${
                      active
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <InstrumentSvgThumb
                      type={row.stage_plot_type}
                      svgIcon={row.svg_icon}
                      rasterUrl={row.stage_plot_raster_url}
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-slate-800">
                        {row.instrumento || row.id}
                      </span>
                      <span className="block truncate text-[9px] text-slate-400">
                        {famLabel}
                        {" · "}
                        {stagePlotIconStatusLabel(row, typeLabel)}
                      </span>
                    </span>
                    <IconChevronDown
                      size={12}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        active ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {active && (
                    <div className="mt-1 mb-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                      <div className="flex items-center gap-2">
                        <InstrumentSvgThumb
                          type={row.stage_plot_type}
                          svgIcon={row.svg_icon}
                          rasterUrl={row.stage_plot_raster_url}
                          className="h-14 w-14 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-slate-600">
                            Vista previa
                          </p>
                          <p className="text-[9px] leading-snug text-slate-400">
                            {row.stage_plot_raster_url
                              ? row.svg_icon
                                ? "PNG/WebP activo. El SVG queda de reserva."
                                : "PNG/WebP activo."
                              : row.svg_icon
                                ? "SVG personalizado en DB"
                                : hasIcon
                                  ? "Ícono estático / silueta"
                                  : "Sin ícono — asigná SVG, PNG o clave de ícono"}
                          </p>
                        </div>
                      </div>

                      <label className="block text-[9px] font-medium text-slate-500">
                        Familia
                        <select
                          disabled={!canEdit || savingFamilia}
                          value={row.familia || ""}
                          onChange={(e) =>
                            saveFamilia(e.target.value || null)
                          }
                          className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                        >
                          <option value="">— Sin familia —</option>
                          {familias.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </label>

                      {resolveInstrumentStagePlotType(row) === "timpani" ? (
                        <div className="space-y-1.5">
                          {STAGE_PLOT_TIMPANI_SIZES.map((size) => (
                            <div
                              key={size}
                              className="grid grid-cols-[2.25rem_1fr_1fr] items-end gap-1.5"
                            >
                              <span className="pb-1 text-[11px] font-bold tabular-nums text-slate-700">
                                {size}
                              </span>
                              <label className="block text-[9px] font-medium text-slate-500">
                                Ancho (cm)
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!canEdit || savingSize}
                                  value={timpaniFields?.[size]?.width || ""}
                                  onChange={(e) =>
                                    setTimpaniFields((prev) => ({
                                      ...prev,
                                      [size]: {
                                        ...prev?.[size],
                                        width: e.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={saveTimpaniSizes}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                                />
                              </label>
                              <label className="block text-[9px] font-medium text-slate-500">
                                Profundo (cm)
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  disabled={!canEdit || savingSize}
                                  value={timpaniFields?.[size]?.height || ""}
                                  onChange={(e) =>
                                    setTimpaniFields((prev) => ({
                                      ...prev,
                                      [size]: {
                                        ...prev?.[size],
                                        height: e.target.value,
                                      },
                                    }))
                                  }
                                  onBlur={saveTimpaniSizes}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                                />
                              </label>
                            </div>
                          ))}
                          <p className="text-[9px] text-slate-400">
                            Cada medida tiene su huella (10–400 cm). El 32 es el tamaño de catálogo. Enter/blur guarda las cuatro.
                          </p>
                        </div>
                      ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="block text-[9px] font-medium text-slate-500">
                          Ancho (cm)
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={!canEdit || savingSize}
                            value={widthCm}
                            onChange={(e) => setWidthCm(e.target.value)}
                            onBlur={saveSize}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="50"
                            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                          />
                        </label>
                        <label className="block text-[9px] font-medium text-slate-500">
                          Profundo (cm)
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={!canEdit || savingSize}
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            onBlur={saveSize}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="50"
                            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                          />
                        </label>
                      </div>
                      )}
                      {resolveInstrumentStagePlotType(row) === "timpani" ? null : (
                      <p className="text-[9px] text-slate-400">
                        Vacío = 50 cm. El tamaño del catálogo aplica a todos los planos. Enter/blur guarda.
                      </p>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {row.svg_icon ? (
                          <button
                            type="button"
                            onClick={() => {
                              const ok = downloadStagePlotSvgMarkup(
                                row.svg_icon,
                                stagePlotRowDownloadName(row),
                              );
                              if (!ok) toast.error("No hay SVG para descargar.");
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                            title="Guardar una copia del SVG actual"
                          >
                            <IconDownload size={12} /> Descargar SVG
                          </button>
                        ) : null}
                        {row.stage_plot_raster_url ? (
                          <button
                            type="button"
                            disabled={savingSvg}
                            onClick={async () => {
                              try {
                                const mode = await downloadStagePlotRasterUrl(
                                  row.stage_plot_raster_url,
                                  stagePlotRowDownloadName(row),
                                );
                                if (mode === "tab") {
                                  toast.message(
                                    "Se abrió la imagen. Guardala desde el navegador.",
                                  );
                                }
                              } catch (err) {
                                toast.error(
                                  err?.message || "No se pudo descargar el PNG.",
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            title="Guardar una copia del PNG o WebP actual"
                          >
                            <IconDownload size={12} />{" "}
                            {stagePlotRasterDownloadExt(row.stage_plot_raster_url) ===
                            "webp"
                              ? "Descargar WebP"
                              : "Descargar PNG"}
                          </button>
                        ) : null}
                        {canEdit ? (
                          <>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                            <IconUpload size={12} />
                            Subir SVG
                            <input
                              type="file"
                              accept=".svg,image/svg+xml"
                              className={STAGE_PLOT_FILE_INPUT_CLASS}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (!file) return;
                                if (
                                  !/\.svg$/i.test(file.name || "") &&
                                  file.type &&
                                  file.type !== "image/svg+xml"
                                ) {
                                  toast.error(
                                    "Solo se aceptan archivos SVG (no PNG/JPG).",
                                  );
                                  return;
                                }
                                if (file.size > STAGE_PLOT_SVG_MAX_CHARS) {
                                  toast.error(
                                    `Archivo demasiado grande (máx. ${formatStagePlotSvgMaxChars()} caracteres).`,
                                  );
                                  return;
                                }
                                try {
                                  await requestSvgChange(await file.text());
                                } catch {
                                  toast.error("No se pudo leer el archivo.");
                                }
                              }}
                            />
                          </label>
                          {row.svg_icon ? (
                            <button
                              type="button"
                              disabled={savingSvg}
                              onClick={() => requestSvgChange("")}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <IconX size={12} /> Quitar SVG
                            </button>
                          ) : null}
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                            <IconUpload size={12} />
                            Subir PNG/WebP
                            <input
                              type="file"
                              accept=".png,.webp,image/png,image/webp"
                              className={STAGE_PLOT_FILE_INPUT_CLASS}
                              disabled={savingSvg}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (!file) return;
                                if (classifyStagePlotIconUpload(file) !== "raster") {
                                  toast.error(
                                    "Ese archivo no es PNG ni WebP.",
                                  );
                                  return;
                                }
                                await uploadRaster(file);
                              }}
                            />
                          </label>
                          {row.stage_plot_raster_url ? (
                            <button
                              type="button"
                              disabled={savingSvg}
                              onClick={() => clearRaster()}
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              <IconX size={12} /> Quitar PNG
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={savingSize}
                            onClick={
                              resolveInstrumentStagePlotType(row) === "timpani"
                                ? saveTimpaniSizes
                                : saveSize
                            }
                            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-100"
                          >
                            <IconPencil size={12} />
                            {savingSize ? "Guardando…" : "Guardar tamaño"}
                          </button>
                          </>
                        ) : (
                          <p className="self-center text-[10px] text-slate-400">Solo lectura</p>
                        )}
                      </div>
                      <p className="text-[9px] leading-snug text-slate-400">
                        {STAGE_PLOT_RASTER_HINT} Subir un SVG nuevo quita el PNG para que se vea el dibujo vectorial.
                      </p>

                      <details className="rounded border border-slate-200 bg-white/80 px-2 py-1.5">
                        <summary className="cursor-pointer text-[9px] font-semibold text-slate-500">
                          Clave de ícono en el plano
                          {row.stage_plot_type
                            ? ` · ${row.stage_plot_type}`
                            : " · sin asignar"}
                        </summary>
                        <div className="mt-1.5 space-y-1">
                          <label className="block text-[9px] font-medium text-slate-500">
                            Slug interno (paleta / SVG)
                            <select
                              disabled={!canEdit || savingSize}
                              value={row.stage_plot_type || ""}
                              onChange={(e) =>
                                saveType(e.target.value || null)
                              }
                              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                            >
                              <option value="">— Sin clave —</option>
                              {PANEL_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label} ({o.value})
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="text-[9px] leading-snug text-slate-400">
                            No es la familia ni otro instrumento: solo enlaza el
                            ícono del lienzo (ej. violin, bandoneon). Material
                            sin fila en Instrumentos → Inventario /
                            elementos_escenario.
                          </p>
                          {canEdit && suggestedType ? (
                            <button
                              type="button"
                              disabled={savingSize}
                              onClick={() => saveType(suggestedType.value)}
                              className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                            >
                              Usar sugerido: {suggestedType.label} (
                              {suggestedType.value})
                            </button>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CreateInstrumentoModal({
  open,
  onClose,
  supabase,
  familias,
  onCreated,
}) {
  const [id, setId] = useState("");
  const [nombre, setNombre] = useState("");
  const [familia, setFamilia] = useState(familias[0] || "");
  const [widthCm, setWidthCm] = useState("50");
  const [heightCm, setHeightCm] = useState("50");
  const [iconKey, setIconKey] = useState("");
  const [iconKeyManual, setIconKeyManual] = useState(false);
  const [allowShared, setAllowShared] = useState(false);
  const [svgText, setSvgText] = useState("");
  const [svgPreview, setSvgPreview] = useState(null);
  const [rasterFile, setRasterFile] = useState(null);
  const [rasterPreview, setRasterPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharedHint, setSharedHint] = useState(null);

  useEffect(() => {
    if (!open) return;
    setId("");
    setNombre("");
    setFamilia(familias[0] || "");
    setWidthCm("50");
    setHeightCm("50");
    setIconKey("");
    setIconKeyManual(false);
    setAllowShared(false);
    setSvgText("");
    setSvgPreview(null);
    setRasterFile(null);
    setRasterPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSharedHint(null);
  }, [open, familias]);

  useEffect(() => {
    if (!open || iconKeyManual) return;
    const suggested =
      suggestStagePlotTypeFromName(nombre)?.value ||
      normalizeInstrumentStagePlotType(nombre) ||
      "";
    setIconKey(suggested);
  }, [nombre, open, iconKeyManual]);

  useEffect(() => {
    if (!open || !iconKey) {
      setSharedHint(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { taken, ids } = await findInstrumentosByStagePlotType(iconKey, {
          client: supabase,
        });
        if (cancelled) return;
        setSharedHint(taken ? ids : null);
      } catch {
        if (!cancelled) setSharedHint(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [iconKey, open, supabase]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      if (rasterFile) {
        const checked = await validateStagePlotRasterFile(rasterFile);
        if (!checked.ok) {
          toast.error(checked.error);
          return;
        }
      }
      const created = await createInstrumento(
        {
          id,
          instrumento: nombre,
          familia,
          stage_plot_type: iconKey || null,
          stage_plot_width_cm: widthCm,
          stage_plot_height_cm: heightCm,
          svg_icon: svgText || null,
          allowSharedIconKey: allowShared,
        },
        { client: supabase },
      );
      let rasterOk = !rasterFile;
      if (rasterFile) {
        try {
          const url = await setInstrumentoStagePlotRaster(created.id, rasterFile, {
            client: supabase,
          });
          created.stage_plot_raster_url = url;
          rasterOk = true;
        } catch (err) {
          toast.error(
            err?.message ||
              "El instrumento se creó, pero el PNG no se pudo subir. Podés subirlo desde el editor.",
          );
        }
      } else {
        await reloadStagePlotInstrumentIcons().catch(() => {});
      }
      if (rasterOk) {
        toast.success(`Instrumento «${created.instrumento}» creado`);
      }
      onCreated?.(created);
      onClose();
    } catch (err) {
      toast.error(err?.message || "No se pudo crear el instrumento");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,40rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-100 bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-instrumento-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3
              id="create-instrumento-title"
              className="text-base font-bold text-slate-800"
            >
              Crear instrumento
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Alta en la tabla <code className="text-[10px]">instrumentos</code>
              . El ícono puede ser SVG o PNG/WebP. Material que no es un
              instrumento → Inventario / elementos_escenario.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-2.5">
          <label className="block text-[10px] font-medium text-slate-500">
            ID (código, texto)
            <input
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Ej: 16, 22c, Sax"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-[12px]"
            />
          </label>
          <label className="block text-[10px] font-medium text-slate-500">
            Nombre
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Saxofón"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
            />
          </label>
          <label className="block text-[10px] font-medium text-slate-500">
            Familia
            <select
              required
              value={familia}
              onChange={(e) => setFamilia(e.target.value)}
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
            >
              {familias.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[10px] font-medium text-slate-500">
              Ancho (cm)
              <input
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                inputMode="decimal"
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
              />
            </label>
            <label className="block text-[10px] font-medium text-slate-500">
              Profundo (cm)
              <input
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                inputMode="decimal"
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-[12px]"
              />
            </label>
          </div>

          <details className="rounded border border-slate-200 bg-slate-50/80 px-2 py-1.5">
            <summary className="cursor-pointer text-[10px] font-semibold text-slate-500">
              Clave de ícono en el plano (opcional)
            </summary>
            <div className="mt-1.5 space-y-1.5">
              <input
                value={iconKey}
                onChange={(e) => {
                  setIconKeyManual(true);
                  setIconKey(e.target.value);
                }}
                placeholder="slug (auto desde nombre)"
                className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[11px]"
              />
              <select
                value={
                  PANEL_TYPE_OPTIONS.some((o) => o.value === iconKey)
                    ? iconKey
                    : ""
                }
                onChange={(e) => {
                  setIconKeyManual(true);
                  setIconKey(e.target.value);
                }}
                className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
              >
                <option value="">— Elegir de lista —</option>
                {PANEL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.value})
                  </option>
                ))}
              </select>
              {sharedHint?.length ? (
                <label className="flex items-start gap-1.5 text-[10px] text-amber-800">
                  <input
                    type="checkbox"
                    checked={allowShared}
                    onChange={(e) => setAllowShared(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Ya usada por {sharedHint.join(", ")}. Permitir compartir
                    (variantes).
                  </span>
                </label>
              ) : null}
            </div>
          </details>

          <div>
            <p className="mb-1 text-[10px] font-medium text-slate-500">
              Ícono (opcional, SVG o PNG/WebP)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                <IconUpload size={12} />
                Subir SVG
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  className={STAGE_PLOT_FILE_INPUT_CLASS}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const prepared = prepareInstrumentSvgIconForSave(text);
                      if (!prepared.ok) {
                        toast.error(prepared.error);
                        return;
                      }
                      setSvgText(prepared.value || "");
                      setSvgPreview(
                        prepared.value
                          ? previewSrcFromMarkup(prepared.value)
                          : null,
                      );
                      if (prepared.cleaned && prepared.value) {
                        toast.message(
                          "SVG limpiado (metadata de editor / código no permitido removidos).",
                        );
                      }
                    } catch {
                      toast.error("No se pudo leer el archivo.");
                    }
                  }}
                />
              </label>
              {svgText ? (
                <button
                  type="button"
                  onClick={() => {
                    setSvgText("");
                    setSvgPreview(null);
                  }}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                >
                  Quitar
                </button>
              ) : null}
              {svgPreview ? (
                <img
                  src={svgPreview}
                  alt=""
                  className="h-10 w-10 rounded border border-slate-100 bg-slate-50 object-contain p-0.5"
                />
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                <IconUpload size={12} />
                Subir PNG/WebP
                <input
                  type="file"
                  accept=".png,.webp,image/png,image/webp"
                  className={STAGE_PLOT_FILE_INPUT_CLASS}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (classifyStagePlotIconUpload(file) !== "raster") {
                      toast.error("Ese archivo no es PNG ni WebP.");
                      return;
                    }
                    const checked = await validateStagePlotRasterFile(file);
                    if (!checked.ok) {
                      toast.error(checked.error);
                      return;
                    }
                    setRasterFile(file);
                    setRasterPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(file);
                    });
                  }}
                />
              </label>
              {rasterFile ? (
                <button
                  type="button"
                  onClick={() => {
                    setRasterFile(null);
                    setRasterPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                  }}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                >
                  Quitar PNG
                </button>
              ) : null}
              {rasterPreview ? (
                <img
                  src={rasterPreview}
                  alt=""
                  className="h-10 w-10 rounded border border-slate-100 bg-slate-50 object-contain p-0.5"
                />
              ) : null}
            </div>
            <p className="mt-1 text-[9px] leading-snug text-slate-400">
              {STAGE_PLOT_RASTER_HINT} Si subís los dos, el plano muestra el PNG.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconPlus size={14} />
              )}
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function formatSoloistCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function parseSoloistCm(raw) {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Solistas: Ancho × Alto cm en `elementos_escenario`. Aplica a todos los planos.
 */
function SoloistSizeEditor({ supabase, canEdit, onCatalogReload }) {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    listElementosEscenario({ onlyActive: true })
      .then((list) => {
        if (cancelled) return;
        const soloists = (list || [])
          .filter((row) => STAGE_PLOT_SOLOIST_TYPES.has(row.stage_plot_type))
          .sort((a, b) =>
            String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"),
          );
        setRows(soloists);
        setDrafts(
          Object.fromEntries(
            soloists.map((row) => [
              row.id,
              {
                width: formatSoloistCm(row.width_cm),
                height: formatSoloistCm(row.height_cm),
              },
            ]),
          ),
        );
      })
      .catch((err) => {
        console.warn("[SoloistSizeEditor]", err?.message || err);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const save = async (row) => {
    if (!canEdit || !supabase) return;
    const draft = drafts[row.id] || {};
    const widthCm = parseSoloistCm(draft.width);
    const heightCm = parseSoloistCm(draft.height);
    if (widthCm == null || heightCm == null || widthCm < 5 || heightCm < 5 || widthCm > 800 || heightCm > 800) {
      toast.error("Ancho y alto: entre 5 y 800 cm");
      return;
    }
    const prevW = Number(row.width_cm);
    const prevH = Number(row.height_cm);
    if (widthCm === prevW && heightCm === prevH) return;
    setSavingId(row.id);
    try {
      const saved = await upsertElementoEscenario({
        id: row.id,
        nombre: row.nombre,
        stage_plot_type: row.stage_plot_type,
        svg_icon: row.svg_icon ?? null,
        width_cm: widthCm,
        height_cm: heightCm,
        activo: row.activo !== false,
        stage_plot_raster_url: row.stage_plot_raster_url ?? null,
      });
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...saved } : item)));
      onCatalogReload?.();
      toast.success("Tamaño del solista actualizado");
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar el tamaño");
    } finally {
      setSavingId(null);
    }
  };

  if (!rows.length) return null;

  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2">
      <p className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        Solistas
      </p>
      <p className="mb-2 px-0.5 text-[9px] leading-snug text-slate-400">
        Ancho × alto de la figura. Aplica a todos los planos. Enter o salir del campo guarda.
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const draft = drafts[row.id] || { width: "", height: "" };
          const busy = savingId === row.id;
          return (
            <div key={row.id} className="rounded border border-slate-100 bg-slate-50/80 p-1.5">
              <div className="mb-1 flex items-center gap-1.5">
                <InstrumentSvgThumb
                  type={row.stage_plot_type}
                  rasterUrl={row.stage_plot_raster_url}
                  className="h-8 w-8 shrink-0"
                />
                <span className="min-w-0 truncate text-[11px] font-semibold text-slate-800">
                  {row.nombre}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="block text-[9px] font-medium text-slate-500">
                  Ancho (cm)
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={!canEdit || busy}
                    value={draft.width}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...draft, width: e.target.value },
                      }))
                    }
                    onBlur={() => save(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                  />
                </label>
                <label className="block text-[9px] font-medium text-slate-500">
                  Alto (cm)
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={!canEdit || busy}
                    value={draft.height}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...draft, height: e.target.value },
                      }))
                    }
                    onBlur={() => save(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Editor de íconos / tamaño de huella de instrumentos (panel izquierdo Escenario → Editor).
 * Clasificación de usuario: `familia`. Clave interna: `stage_plot_type`.
 * El tamaño (`stage_plot_width_cm` / `height_cm`) es canónico: todos los planos lo usan.
 */
export default function StagePlotInstrumentsPanel({
  supabase,
  canEdit = false,
  onInstrumentsChange,
  onCatalogReload,
}) {
  const [rows, setRows] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [timpaniFields, setTimpaniFields] = useState(null);
  const [savingSize, setSavingSize] = useState(false);
  const [savingSvg, setSavingSvg] = useState(false);
  const [savingFamilia, setSavingFamilia] = useState(false);
  const [pendingSvg, setPendingSvg] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const notifyParent = useCallback(
    (nextRows) => {
      onInstrumentsChange?.(nextRows);
    },
    [onInstrumentsChange],
  );

  const loadRows = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setLoadError(null);
    const baseCols =
      "id, instrumento, familia, stage_plot_type, stage_plot_width_cm, stage_plot_height_cm, svg_icon, stage_plot_raster_url";
    const [firstRes, fams] = await Promise.all([
      supabase
        .from("instrumentos")
        .select(`${baseCols}, stage_plot_timpani_sizes`)
        .order("instrumento", { ascending: true }),
      listInstrumentosFamilias(supabase),
    ]);
    let rowsRes = firstRes;
    if (
      rowsRes.error &&
      /stage_plot_timpani_sizes/i.test(rowsRes.error.message || "")
    ) {
      rowsRes = await supabase
        .from("instrumentos")
        .select(baseCols)
        .order("instrumento", { ascending: true });
    }

    setFamilias(fams);

    if (rowsRes.error) {
      console.warn("[StagePlotInstrumentsPanel]", rowsRes.error.message);
      setLoadError(rowsRes.error.message);
      setRows([]);
      notifyParent([]);
    } else {
      const next = rowsRes.data || [];
      setRows(next);
      notifyParent(next);
    }
    setLoading(false);
  }, [supabase, notifyParent]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const selected = useMemo(
    () => rows.find((r) => String(r.id) === String(selectedId)) || null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setWidthCm("");
      setHeightCm("");
      return;
    }
    setWidthCm(
      selected.stage_plot_width_cm == null ||
        selected.stage_plot_width_cm === ""
        ? ""
        : String(selected.stage_plot_width_cm),
    );
    setHeightCm(
      selected.stage_plot_height_cm == null ||
        selected.stage_plot_height_cm === ""
        ? ""
        : String(selected.stage_plot_height_cm),
    );
    if (resolveInstrumentStagePlotType(selected) === "timpani") {
      setTimpaniFields(timpaniFieldsFromRow(selected));
    } else {
      setTimpaniFields(null);
    }
  }, [selected]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    return rows.filter((r) =>
      matchesMultiTokenSearch(
        [
          r.instrumento,
          r.stage_plot_type,
          TYPE_LABEL.get(r.stage_plot_type),
          r.familia,
          r.id,
        ],
        filter,
      ),
    );
  }, [rows, filter]);

  const { withIcon, withoutIcon } = useMemo(
    () => partitionInstrumentosByStagePlotIcon(filtered),
    [filtered],
  );

  const patchRowLocal = (id, patch) => {
    setRows((prev) => {
      const next = prev.map((r) =>
        String(r.id) === String(id) ? { ...r, ...patch } : r,
      );
      notifyParent(next);
      return next;
    });
  };

  const saveSize = async () => {
    if (!canEdit || !selected || !supabase) return;
    const wRaw = widthCm.trim();
    const hRaw = heightCm.trim();
    const w = wRaw === "" ? null : Number(wRaw);
    const h = hRaw === "" ? null : Number(hRaw);
    if (wRaw !== "" && (!Number.isFinite(w) || w <= 0)) {
      toast.error("Ancho inválido (cm)");
      return;
    }
    if (hRaw !== "" && (!Number.isFinite(h) || h <= 0)) {
      toast.error("Profundo inválido (cm)");
      return;
    }
    const prevW =
      selected.stage_plot_width_cm == null
        ? null
        : Number(selected.stage_plot_width_cm);
    const prevH =
      selected.stage_plot_height_cm == null
        ? null
        : Number(selected.stage_plot_height_cm);
    if (w === prevW && h === prevH) return;

    setSavingSize(true);
    const { error } = await supabase
      .from("instrumentos")
      .update({
        stage_plot_width_cm: w,
        stage_plot_height_cm: h,
      })
      .eq("id", selected.id);
    setSavingSize(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar el tamaño");
      return;
    }
    patchRowLocal(selected.id, {
      stage_plot_width_cm: w,
      stage_plot_height_cm: h,
    });
    const type = resolveInstrumentStagePlotType({
      ...selected,
      stage_plot_width_cm: w,
      stage_plot_height_cm: h,
    });
    // Override inmediato: el lienzo abierto no espera el round-trip de reload.
    applyStagePlotInstrumentSizeOverride(type, w, h);
    await reloadStagePlotInstrumentIcons().catch(() => {});
    // Re-aplicar tras reload (orden de filas / tipos compartidos).
    applyStagePlotInstrumentSizeOverride(type, w, h);
    onCatalogReload?.();
    toast.success("Tamaño actualizado (aplica a todos los planos)");
  };

  const saveTimpaniSizes = async () => {
    if (!canEdit || !selected || !supabase || savingSize) return;
    if (resolveInstrumentStagePlotType(selected) !== "timpani") return;
    const bySize = {};
    for (const size of STAGE_PLOT_TIMPANI_SIZES) {
      const field = timpaniFields?.[size] || {};
      const w = parsePanelCm(field.width);
      const h = parsePanelCm(field.height);
      if (w == null || h == null || w < 10 || h < 10 || w > 400 || h > 400) {
        toast.error(`Timbal ${size}: ancho y profundo entre 10 y 400 cm`);
        return;
      }
      bySize[size] = { widthCm: w, heightCm: h };
    }
    const prev = timpaniFieldsFromRow(selected);
    const unchanged = STAGE_PLOT_TIMPANI_SIZES.every((size) => {
      return (
        bySize[size].widthCm === parsePanelCm(prev[size]?.width) &&
        bySize[size].heightCm === parsePanelCm(prev[size]?.height)
      );
    });
    if (unchanged) return;

    const sizesJson = stagePlotTimpaniSizesJson(bySize);
    const base = bySize[STAGE_PLOT_TIMPANI_SIZE_DEFAULT];
    setSavingSize(true);
    try {
      const ids = await saveInstrumentosTimpaniFootprints(supabase, {
        widthCm: base.widthCm,
        heightCm: base.heightCm,
        sizesJson,
      });
      const idSet = new Set((ids || []).map((id) => String(id)));
      setRows((prevRows) => {
        const next = prevRows.map((row) =>
          idSet.has(String(row.id))
            ? {
                ...row,
                stage_plot_width_cm: base.widthCm,
                stage_plot_height_cm: base.heightCm,
                stage_plot_timpani_sizes: sizesJson,
              }
            : row,
        );
        notifyParent(next);
        return next;
      });
      await reloadStagePlotInstrumentIcons().catch(() => {});
      applyStagePlotInstrumentSizeOverride("timpani", base.widthCm, base.heightCm);
      setStagePlotTimpaniSizeOverrides(parseStagePlotTimpaniSizesJson(sizesJson));
      onCatalogReload?.();
      toast.success("Tamaño actualizado (aplica a todos los planos)");
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar el tamaño");
    } finally {
      setSavingSize(false);
    }
  };

  const saveFamilia = async (nextFamilia) => {
    if (!canEdit || !selected || !supabase) return;
    const normalized =
      nextFamilia && String(nextFamilia).trim()
        ? String(nextFamilia).trim()
        : null;
    const prev = selected.familia ? String(selected.familia).trim() : null;
    if (normalized === prev) return;
    setSavingFamilia(true);
    const { error } = await supabase
      .from("instrumentos")
      .update({ familia: normalized })
      .eq("id", selected.id);
    setSavingFamilia(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar la familia");
      return;
    }
    patchRowLocal(selected.id, { familia: normalized });
    toast.success(
      normalized ? "Familia actualizada" : "Familia quitada",
    );
  };

  const saveType = async (nextType) => {
    if (!canEdit || !selected || !supabase) return;
    const normalized = nextType
      ? normalizeInstrumentStagePlotType(nextType) || String(nextType).trim()
      : null;
    const prev = selected.stage_plot_type
      ? String(selected.stage_plot_type).trim()
      : null;
    if (normalized === prev) return;
    setSavingSize(true);
    const { error } = await supabase
      .from("instrumentos")
      .update({ stage_plot_type: normalized })
      .eq("id", selected.id);
    setSavingSize(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar la clave de ícono");
      return;
    }
    patchRowLocal(selected.id, { stage_plot_type: normalized });
    await reloadStagePlotInstrumentIcons().catch(() => {});
    onCatalogReload?.();
    toast.success(
      normalized
        ? "Clave de ícono actualizada"
        : "Clave de ícono quitada",
    );
  };

  const requestSvgChange = async (raw) => {
    if (!canEdit || !selected) return;
    const prepared = prepareInstrumentSvgIconForSave(raw);
    if (!prepared.ok) {
      toast.error(prepared.error);
      return;
    }
    const nextSvg = prepared.value;
    const current = selected.svg_icon || null;
    if (String(nextSvg ?? "") === String(current ?? "")) return;

    if (prepared.cleaned && nextSvg) {
      toast.message(
        "SVG limpiado (metadata de editor / código no permitido removidos).",
      );
    }

    let currentSrc = previewSrcFromMarkup(current);
    if (!currentSrc && selected.stage_plot_type) {
      const markup =
        (await resolveStagePlotIconSvgMarkup(selected.stage_plot_type)) ||
        stagePlotSilhouetteSvgMarkup(
          selected.stage_plot_type,
          "#1e293b",
          64,
        );
      currentSrc = previewSrcFromMarkup(markup);
    }
    const nextSrc = nextSvg ? previewSrcFromMarkup(nextSvg) : null;
    setPendingSvg({ nextSvg, currentSrc, nextSrc });
  };

  const confirmSvgChange = async () => {
    if (!pendingSvg || !selected || !supabase || !canEdit) {
      setPendingSvg(null);
      return;
    }
    setSavingSvg(true);
    try {
      const saved = await saveInstrumentoSvgIcon(selected.id, pendingSvg.nextSvg, {
        previousRasterUrl: selected.stage_plot_raster_url,
        client: supabase,
      });
      patchRowLocal(selected.id, {
        svg_icon: saved.svg,
        ...(saved.clearedRaster ? { stage_plot_raster_url: null } : {}),
      });
      setPendingSvg(null);
      onCatalogReload?.();
      toast.success(
        pendingSvg.nextSvg
          ? saved.clearedRaster
            ? "Ícono SVG actualizado. Se quitó el PNG para que se vea este dibujo."
            : "Ícono SVG actualizado"
          : "SVG personalizado quitado",
      );
    } catch (err) {
      toast.error(err?.message || "No se pudo guardar el SVG");
      throw err;
    } finally {
      setSavingSvg(false);
    }
  };

  const uploadRaster = async (file) => {
    if (!canEdit || !selected || !supabase) return;
    setSavingSvg(true);
    try {
      const url = await setInstrumentoStagePlotRaster(selected.id, file, {
        previousUrl: selected.stage_plot_raster_url,
        client: supabase,
      });
      patchRowLocal(selected.id, { stage_plot_raster_url: url });
      onCatalogReload?.();
      toast.success("Ícono PNG/WebP actualizado");
    } catch (err) {
      toast.error(err?.message || "No se pudo subir el PNG");
    } finally {
      setSavingSvg(false);
    }
  };

  const clearRaster = async () => {
    if (!canEdit || !selected?.stage_plot_raster_url || !supabase) return;
    setSavingSvg(true);
    try {
      await clearInstrumentoStagePlotRaster(selected.id, {
        previousUrl: selected.stage_plot_raster_url,
        client: supabase,
      });
      patchRowLocal(selected.id, { stage_plot_raster_url: null });
      onCatalogReload?.();
      toast.success("PNG quitado. El plano vuelve al SVG.");
    } catch (err) {
      toast.error(err?.message || "No se pudo quitar el PNG");
    } finally {
      setSavingSvg(false);
    }
  };

  const typeLabel = (type) =>
    TYPE_LABEL.get(type) ||
    getStagePlotCatalogItem(type)?.name ||
    type ||
    "—";

  const listProps = {
    selectedId,
    setSelectedId,
    typeLabel,
    canEdit,
    savingSize,
    savingSvg,
    savingFamilia,
    familias,
    widthCm,
    setWidthCm,
    heightCm,
    setHeightCm,
    saveSize,
    timpaniFields,
    setTimpaniFields,
    saveTimpaniSizes,
    saveType,
    saveFamilia,
    requestSvgChange,
    uploadRaster,
    clearRaster,
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[10px] leading-snug text-slate-400">
        Editor de instrumentos: familia, tamaño de huella (catálogo) y ícono SVG o PNG/WebP. Agrupados por
        familia. Los solistas se miden acá (ancho × alto). El resto del material sin instrumento → Inventario.
      </p>

      <SoloistSizeEditor
        supabase={supabase}
        canEdit={canEdit}
        onCatalogReload={onCatalogReload}
      />

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar instrumento…"
        className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-700 placeholder:text-slate-400"
      />

      {loading ? (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
          <IconLoader size={12} className="animate-spin" /> Cargando…
        </p>
      ) : loadError ? (
        <p className="px-1 text-[11px] text-red-600">{loadError}</p>
      ) : filtered.length === 0 ? (
        <p className="px-1 text-[11px] text-slate-400">
          No hay instrumentos{filter.trim() ? " que coincidan" : ""}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {withIcon.length > 0 && (
            <InstrumentRowList rows={withIcon} {...listProps} />
          )}
          {withoutIcon.length > 0 && (
            <div>
              <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Instrumentos sin ícono
              </p>
              <InstrumentRowList rows={withoutIcon} {...listProps} />
            </div>
          )}
        </div>
      )}

      {canEdit ? (
        <div className="mt-1 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            <IconPlus size={12} /> Crear instrumento
          </button>
          <p className="mt-1 px-1 text-[9px] leading-snug text-slate-400">
            SVG sin fila en Instrumentos no va acá: usá Inventario /
            elementos_escenario.
          </p>
        </div>
      ) : null}

      <CreateInstrumentoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        supabase={supabase}
        familias={familias}
        onCreated={(created) => {
          setRows((prev) => {
            const next = [...prev, created].sort((a, b) =>
              String(a.instrumento || "").localeCompare(
                String(b.instrumento || ""),
                "es",
              ),
            );
            notifyParent(next);
            return next;
          });
          setSelectedId(created.id);
          onCatalogReload?.();
        }}
      />

      <ConfirmModal
        isOpen={!!pendingSvg}
        onClose={() => {
          if (savingSvg) return;
          setPendingSvg(null);
        }}
        onConfirm={confirmSvgChange}
        title="¿Seguro que deseás cambiar por este nuevo ícono?"
        message={
          pendingSvg?.nextSvg && selected?.stage_plot_raster_url
            ? "Se reemplaza el SVG y se quita el PNG/WebP, para que el plano muestre este dibujo. Los ítems ya colocados se redibujan."
            : "Se reemplazará el SVG del instrumento en el catálogo. Los ítems ya colocados usan el ícono al redibujar."
        }
        confirmText={pendingSvg?.nextSvg ? "Cambiar ícono" : "Quitar SVG"}
        cancelText="Cancelar"
        confirmLoading={savingSvg}
        overlayClassName="z-[100]"
      >
        {pendingSvg ? (
          <div className="mt-3 flex items-stretch justify-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <SvgCompareThumb
              label="Actual"
              src={pendingSvg.currentSrc}
              emptyLabel="Sin SVG"
            />
            <div
              className="w-px self-stretch bg-slate-200"
              aria-hidden
            />
            <SvgCompareThumb
              label="Nuevo"
              src={pendingSvg.nextSrc}
              emptyLabel="Estático"
            />
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
