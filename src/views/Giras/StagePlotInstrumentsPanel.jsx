import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  IconChevronDown,
  IconLoader,
  IconMusic,
  IconPencil,
  IconPlus,
  IconUpload,
  IconX,
} from "../../components/ui/Icons";
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
  STAGE_PLOT_INSTRUMENT_TYPE_OPTIONS,
} from "../../services/stagePlotInstrumentIconsService";
import { getStagePlotCatalogItem } from "../../utils/stagePlotCatalog";
import {
  resolveStagePlotIconSvgMarkup,
  stagePlotIconImgSrc,
} from "../../utils/stagePlotIconAssets";
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

function previewSrcFromMarkup(svg) {
  if (!svg) return null;
  const r = sanitizeStagePlotSvgMarkup(svg);
  if (!r.ok || !r.svg) return null;
  return stagePlotSvgToDataUrl(r.svg, "#1e293b");
}

/** Thumbnail: DB SVG → estático → silueta. */
function InstrumentSvgThumb({ type, svgIcon, className = "h-10 w-10" }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
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
  }, [type, svgIcon]);

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
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {src ? (
        <img
          src={src}
          alt={label}
          className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-1 text-center text-[10px] text-slate-400">
          {emptyLabel}
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
  saveType,
  saveFamilia,
  requestSvgChange,
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
                      className="h-8 w-8 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-slate-800">
                        {row.instrumento || row.id}
                      </span>
                      <span className="block truncate text-[9px] text-slate-400">
                        {famLabel}
                        {hasIcon
                          ? ` · ${row.svg_icon ? "SVG" : typeLabel(row.stage_plot_type)}`
                          : row.stage_plot_type
                            ? " · sin visual"
                            : row.svg_icon
                              ? " · SVG sin clave"
                              : " · sin ícono"}
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
                          className="h-14 w-14 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-slate-600">
                            Vista previa
                          </p>
                          <p className="text-[9px] leading-snug text-slate-400">
                            {row.svg_icon
                              ? "SVG personalizado en DB"
                              : hasIcon
                                ? "Ícono estático / silueta"
                                : "Sin ícono — asigná SVG y/o clave de ícono"}
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
                      <p className="text-[9px] text-slate-400">
                        Vacío = 50 cm al insertar. Enter/blur guarda.
                      </p>

                      {canEdit ? (
                        <div className="flex flex-wrap gap-1">
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                            <IconUpload size={12} />
                            Subir SVG
                            <input
                              type="file"
                              accept=".svg,image/svg+xml"
                              className="sr-only"
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
                          <button
                            type="button"
                            disabled={savingSize}
                            onClick={saveSize}
                            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800 hover:bg-indigo-100"
                          >
                            <IconPencil size={12} />
                            {savingSize ? "Guardando…" : "Guardar tamaño"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">Solo lectura</p>
                      )}

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
      await reloadStagePlotInstrumentIcons().catch(() => {});
      toast.success(`Instrumento «${created.instrumento}» creado`);
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
              . SVG de material de escenario (no instrumento) → Inventario /
              elementos_escenario.
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
              SVG (opcional)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">
                <IconUpload size={12} />
                Subir SVG
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="sr-only"
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
            </div>
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

/**
 * Editor de íconos / tamaño insert de instrumentos (panel izquierdo Escenario → Editor).
 * Clasificación de usuario: `familia`. Clave interna: `stage_plot_type`.
 */
export default function StagePlotInstrumentsPanel({
  supabase,
  canEdit = false,
  onInstrumentsChange,
}) {
  const [rows, setRows] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
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
    const [rowsRes, fams] = await Promise.all([
      supabase
        .from("instrumentos")
        .select(
          "id, instrumento, familia, stage_plot_type, stage_plot_width_cm, stage_plot_height_cm, svg_icon",
        )
        .order("instrumento", { ascending: true }),
      listInstrumentosFamilias(supabase),
    ]);

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
  }, [selected]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(r.instrumento || "").toLowerCase();
      const type = String(r.stage_plot_type || "").toLowerCase();
      const fam = String(r.familia || "").toLowerCase();
      const id = String(r.id || "").toLowerCase();
      const typeLabel = (
        TYPE_LABEL.get(r.stage_plot_type) || ""
      ).toLowerCase();
      return (
        name.includes(q) ||
        type.includes(q) ||
        typeLabel.includes(q) ||
        fam.includes(q) ||
        id.includes(q)
      );
    });
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
    await reloadStagePlotInstrumentIcons().catch(() => {});
    toast.success("Tamaño de insert actualizado");
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
    const { error } = await supabase
      .from("instrumentos")
      .update({ svg_icon: pendingSvg.nextSvg })
      .eq("id", selected.id);
    setSavingSvg(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar el SVG");
      throw error;
    }
    patchRowLocal(selected.id, { svg_icon: pendingSvg.nextSvg });
    setPendingSvg(null);
    await reloadStagePlotInstrumentIcons().catch(() => {});
    toast.success(
      pendingSvg.nextSvg ? "Ícono SVG actualizado" : "SVG personalizado quitado",
    );
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
    saveType,
    saveFamilia,
    requestSvgChange,
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[10px] leading-snug text-slate-400">
        Editor de instrumentos: familia, tamaño al insertar y SVG. Agrupados por
        familia. Material sin instrumento → Inventario (elementos_escenario).
      </p>

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
        message="Se reemplazará el SVG del instrumento en el catálogo. Los ítems ya colocados usan el ícono al redibujar."
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
