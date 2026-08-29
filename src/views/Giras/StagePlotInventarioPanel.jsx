import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconLoader,
  IconPlus,
  IconTrash,
  IconRefresh,
} from "../../components/ui/Icons";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  INVENTARIO_CATEGORIAS,
  INVENTARIO_TARIMA_FORMAS,
  createInventarioItem,
  deleteInventarioItem,
  labelForCategoria,
  listInventarioItems,
  listInventarioLog,
  listElementosEscenario,
  loadAndApplyElementosEscenario,
  updateInventarioItem,
  upsertElementoEscenario,
} from "../../services/stagePlotInventarioService";

/**
 * Panel Inventario (stock global) — Escenario right sidebar.
 * @param {{
 *   canEdit: boolean,
 *   userId?: number|null,
 *   furnitureSummary?: object,
 *   onInsertTarima?: (opts: { forma: 'rect'|'oval', ancho_cm: number, profundo_cm: number }) => void,
 *   onInsertElemento?: (stagePlotType: string) => void,
 *   onInventoryChange?: (items: Array) => void,
 * }} props
 */
export default function StagePlotInventarioPanel({
  canEdit,
  userId = null,
  furnitureSummary = null,
  onInsertTarima,
  onInsertElemento,
  onInventoryChange,
}) {
  const { confirm, ConfirmDialogPortal } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [elementos, setElementos] = useState([]);
  const [logItemId, setLogItemId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);

  const [newTarima, setNewTarima] = useState({
    ancho_cm: 200,
    profundo_cm: 100,
    forma: "rect",
    cantidad: 1,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, els] = await Promise.all([
        listInventarioItems(),
        listElementosEscenario({ onlyActive: false }),
      ]);
      setItems(inv);
      setElementos(els);
      await loadAndApplyElementosEscenario();
      onInventoryChange?.(inv);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, [onInventoryChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (logItemId == null) {
      setLogs([]);
      return undefined;
    }
    let cancelled = false;
    listInventarioLog(logItemId, { limit: 15 })
      .then((rows) => {
        if (!cancelled) setLogs(rows);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [logItemId]);

  const simpleItems = items.filter((it) =>
    ["silla", "banqueta", "atril"].includes(it.categoria),
  );
  const tarimaItems = items.filter((it) => it.categoria === "tarima");
  const elementoItems = items.filter((it) => it.categoria === "elemento");

  const saveQty = async (item, qty) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const next = await updateInventarioItem(
        item.id,
        { cantidad: qty },
        { userId, prev: item },
      );
      setItems((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    } catch (err) {
      toast.error(err?.message || "Error al guardar cantidad");
    } finally {
      setBusy(false);
    }
  };

  const saveNotas = async (item, notas) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const next = await updateInventarioItem(
        item.id,
        { notas },
        { userId, prev: item, mensaje: "Notas actualizadas" },
      );
      setItems((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    } catch (err) {
      toast.error(err?.message || "Error al guardar notas");
    } finally {
      setBusy(false);
    }
  };

  const addTarimaRow = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const row = await createInventarioItem(
        {
          categoria: "tarima",
          nombre: `Tarima ${newTarima.forma === "oval" ? "oval" : "rect."} ${newTarima.ancho_cm}×${newTarima.profundo_cm}`,
          cantidad: newTarima.cantidad,
          ancho_cm: newTarima.ancho_cm,
          profundo_cm: newTarima.profundo_cm,
          forma: newTarima.forma,
        },
        { userId, mensaje: "Alta tarima por dimensión" },
      );
      setItems((prev) => [...prev, row]);
      toast.success("Tarima agregada al inventario");
    } catch (err) {
      toast.error(err?.message || "No se pudo crear (¿dims duplicadas?)");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (item) => {
    if (!canEdit) return;
    if (["silla", "banqueta", "atril"].includes(item.categoria)) {
      toast.error("Las categorías base no se eliminan; poné cantidad 0.");
      return;
    }
    const ok = await confirm({
      title: "Eliminar del inventario",
      message: `¿Eliminar «${item.nombre}»?`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteInventarioItem(item.id, { userId });
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      if (logItemId === item.id) setLogItemId(null);
    } catch (err) {
      toast.error(err?.message || "Error al eliminar");
    } finally {
      setBusy(false);
    }
  };

  const stockHint = (cat) => {
    if (!furnitureSummary) return null;
    if (cat === "silla") {
      return `Orgánico pide ${furnitureSummary.sillas?.required ?? "—"} · plano ${furnitureSummary.sillas?.drawn ?? "—"}`;
    }
    if (cat === "banqueta") {
      return `Orgánico pide ${furnitureSummary.banquetas?.required ?? "—"} · plano ${furnitureSummary.banquetas?.drawn ?? "—"}`;
    }
    if (cat === "atril") {
      return `Orgánico pide ${furnitureSummary.atriles?.required ?? "—"} · plano ${furnitureSummary.atriles?.drawn ?? "—"}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-[11px] text-slate-400">
        <IconLoader size={14} className="animate-spin" /> Cargando inventario…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ConfirmDialogPortal}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Inventario global
        </p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          title="Recargar"
        >
          <IconRefresh size={12} />
        </button>
      </div>
      <p className="px-1 text-[9px] leading-snug text-slate-400">
        Stock de orquesta (no por gira). Dibujar en el plano no descuenta;
        solo avisa si te pasás.
      </p>

      {/* Sillas / Banquetas / Atriles */}
      <section>
        <p className="mb-1 px-1 text-[10px] font-semibold text-slate-500">
          Mobiliario (solo stock)
        </p>
        <ul className="space-y-2">
          {simpleItems.map((item) => (
            <li
              key={item.id}
              className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-700">
                  {item.nombre || labelForCategoria(item.categoria)}
                </span>
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    disabled={busy}
                    className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right font-mono text-[11px]"
                    value={item.cantidad}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((r) =>
                          r.id === item.id
                            ? { ...r, cantidad: v === "" ? 0 : Number(v) }
                            : r,
                        ),
                      );
                    }}
                    onBlur={(e) =>
                      saveQty(item, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                    }
                  />
                ) : (
                  <span className="font-mono text-[11px] text-slate-600">
                    {item.cantidad}
                  </span>
                )}
              </div>
              {stockHint(item.categoria) && (
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {stockHint(item.categoria)}
                </p>
              )}
              {canEdit && (
                <input
                  type="text"
                  placeholder="Notas (ej. rota pata)…"
                  className="mt-1 w-full rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[10px] text-slate-600"
                  defaultValue={item.notas || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (item.notas || "")) {
                      saveNotas(item, e.target.value);
                    }
                  }}
                />
              )}
              <button
                type="button"
                className="mt-0.5 text-[9px] text-indigo-600 hover:underline"
                onClick={() =>
                  setLogItemId((id) => (id === item.id ? null : item.id))
                }
              >
                {logItemId === item.id ? "Ocultar historial" : "Historial"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Tarimas */}
      <section>
        <p className="mb-1 px-1 text-[10px] font-semibold text-slate-500">
          Tarimas (una fila por dimensión)
        </p>
        {tarimaItems.length === 0 ? (
          <p className="px-1 text-[10px] text-slate-400">Sin tarimas en stock.</p>
        ) : (
          <ul className="space-y-2">
            {tarimaItems.map((item) => (
              <li
                key={item.id}
                className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1.5"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-slate-700">
                      {item.forma === "oval" ? "Oval" : "Rect."}{" "}
                      {Math.round(item.ancho_cm)}×{Math.round(item.profundo_cm)}{" "}
                      cm
                    </p>
                    <p className="text-[9px] text-slate-400">Stock {item.cantidad}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit && (
                      <input
                        type="number"
                        min={0}
                        disabled={busy}
                        className="w-12 rounded border border-slate-200 px-1 py-0.5 text-right font-mono text-[11px]"
                        value={item.cantidad}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) =>
                            prev.map((r) =>
                              r.id === item.id
                                ? { ...r, cantidad: v === "" ? 0 : Number(v) }
                                : r,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          saveQty(
                            item,
                            Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          )
                        }
                      />
                    )}
                    {canEdit && onInsertTarima && (
                      <button
                        type="button"
                        title="Colocar en el plano"
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                        onClick={() =>
                          onInsertTarima({
                            forma: item.forma === "oval" ? "oval" : "rect",
                            ancho_cm: Number(item.ancho_cm) || 200,
                            profundo_cm: Number(item.profundo_cm) || 100,
                          })
                        }
                      >
                        + Plano
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => removeItem(item)}
                        title="Eliminar"
                      >
                        <IconTrash size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <input
                    type="text"
                    placeholder="Notas…"
                    className="mt-1 w-full rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[10px]"
                    defaultValue={item.notas || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (item.notas || "")) {
                        saveNotas(item, e.target.value);
                      }
                    }}
                  />
                )}
                <button
                  type="button"
                  className="mt-0.5 text-[9px] text-indigo-600 hover:underline"
                  onClick={() =>
                    setLogItemId((id) => (id === item.id ? null : item.id))
                  }
                >
                  {logItemId === item.id ? "Ocultar historial" : "Historial"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="mt-2 space-y-1.5 rounded border border-dashed border-slate-200 p-2">
            <p className="text-[10px] font-semibold text-slate-500">
              Nueva tarima (dims)
            </p>
            <div className="flex flex-wrap gap-1">
              <select
                className="rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                value={newTarima.forma}
                onChange={(e) =>
                  setNewTarima((s) => ({ ...s, forma: e.target.value }))
                }
              >
                {INVENTARIO_TARIMA_FORMAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={10}
                max={800}
                className="w-14 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                value={newTarima.ancho_cm}
                onChange={(e) =>
                  setNewTarima((s) => ({
                    ...s,
                    ancho_cm: Number(e.target.value) || 0,
                  }))
                }
                title="Ancho cm"
              />
              <span className="self-center text-[10px] text-slate-400">×</span>
              <input
                type="number"
                min={10}
                max={800}
                className="w-14 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                value={newTarima.profundo_cm}
                onChange={(e) =>
                  setNewTarima((s) => ({
                    ...s,
                    profundo_cm: Number(e.target.value) || 0,
                  }))
                }
                title="Profundo cm"
              />
              <input
                type="number"
                min={0}
                className="w-12 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
                value={newTarima.cantidad}
                onChange={(e) =>
                  setNewTarima((s) => ({
                    ...s,
                    cantidad: Number(e.target.value) || 0,
                  }))
                }
                title="Cantidad"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={addTarimaRow}
              className="inline-flex w-full items-center justify-center gap-1 rounded bg-slate-800 py-1 text-[10px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <IconPlus size={12} /> Agregar al inventario
            </button>
          </div>
        )}
      </section>

      {/* Elementos (catálogo + stock) */}
      <section>
        <p className="mb-1 px-1 text-[10px] font-semibold text-slate-500">
          Elementos (SVG)
        </p>
        <p className="mb-1 px-1 text-[9px] text-slate-400">
          Catálogo en tabla <code className="text-[9px]">elementos_escenario</code>
          . Stock opcional abajo.
        </p>
        {elementos.length === 0 ? (
          <p className="px-1 text-[10px] text-slate-400">
            Sin elementos. Creá uno con nombre + tipo + SVG.
          </p>
        ) : (
          <ul className="mb-2 space-y-1">
            {elementos.map((el) => (
              <li
                key={el.id}
                className="flex items-center justify-between gap-1 rounded border border-slate-100 px-2 py-1 text-[10px]"
              >
                <span className="truncate font-medium text-slate-700">
                  {el.nombre}
                  {el.stage_plot_type ? (
                    <span className="ml-1 font-mono text-slate-400">
                      ({el.stage_plot_type})
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {canEdit && onInsertElemento && el.stage_plot_type && (
                    <button
                      type="button"
                      title="Colocar en el plano"
                      className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                      onClick={() => onInsertElemento(el.stage_plot_type)}
                    >
                      + Plano
                    </button>
                  )}
                  <span className="text-slate-400">
                    {el.activo ? "activo" : "off"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <ElementoEscenarioQuickAdd
            busy={busy}
            setBusy={setBusy}
            onCreated={async (el) => {
              setElementos((prev) => [...prev, el]);
              try {
                const stock = await createInventarioItem(
                  {
                    categoria: "elemento",
                    nombre: el.nombre,
                    cantidad: 0,
                    elemento_escenario_id: el.id,
                  },
                  { userId, mensaje: "Alta stock elemento" },
                );
                setItems((prev) => [...prev, stock]);
              } catch (err) {
                toast.error(err?.message || "Elemento OK; stock no creado");
              }
            }}
          />
        )}
        {elementoItems.length > 0 && (
          <ul className="mt-2 space-y-1">
            {elementoItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-1 rounded bg-slate-50 px-2 py-1 text-[10px]"
              >
                <span className="truncate text-slate-700">{item.nombre}</span>
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    className="w-12 rounded border border-slate-200 px-1 py-0.5 text-right font-mono"
                    value={item.cantidad}
                    onBlur={(e) =>
                      saveQty(
                        item,
                        Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      )
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setItems((prev) =>
                        prev.map((r) =>
                          r.id === item.id
                            ? { ...r, cantidad: v === "" ? 0 : Number(v) }
                            : r,
                        ),
                      );
                    }}
                  />
                ) : (
                  <span className="font-mono">{item.cantidad}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {logItemId != null && (
        <section className="rounded border border-slate-100 bg-white p-2">
          <p className="mb-1 text-[10px] font-semibold text-slate-500">
            Historial reciente
          </p>
          {logs.length === 0 ? (
            <p className="text-[10px] text-slate-400">Sin movimientos.</p>
          ) : (
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {logs.map((l) => (
                <li key={l.id} className="text-[9px] leading-snug text-slate-600">
                  <span className="font-mono text-slate-400">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </span>
                  {" · "}
                  {l.mensaje || "cambio"}
                  {l.cantidad_anterior != null && l.cantidad_nueva != null
                    ? ` (${l.cantidad_anterior}→${l.cantidad_nueva})`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="px-1 text-[9px] text-slate-400">
        Categorías:{" "}
        {INVENTARIO_CATEGORIAS.map((c) => c.label).join(" · ")}
      </p>
    </div>
  );
}

function ElementoEscenarioQuickAdd({ busy, setBusy, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [widthCm, setWidthCm] = useState(40);
  const [heightCm, setHeightCm] = useState(40);
  const [svg, setSvg] = useState("");

  const submit = async () => {
    if (!nombre.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    setBusy(true);
    try {
      const el = await upsertElementoEscenario({
        nombre: nombre.trim(),
        stage_plot_type: slug.trim() || null,
        width_cm: widthCm,
        height_cm: heightCm,
        svg_icon: svg.trim() || null,
        activo: true,
      });
      toast.success("Elemento creado");
      setNombre("");
      setSlug("");
      setSvg("");
      onCreated?.(el);
    } catch (err) {
      toast.error(err?.message || "Error al crear elemento");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1 rounded border border-dashed border-slate-200 p-2">
      <p className="text-[10px] font-semibold text-slate-500">Nuevo elemento</p>
      <input
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 text-[10px]"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <input
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px]"
        placeholder="slug (stage_plot_type)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <div className="flex gap-1">
        <input
          type="number"
          className="w-1/2 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
          value={widthCm}
          onChange={(e) => setWidthCm(Number(e.target.value) || 40)}
          title="Ancho cm"
        />
        <input
          type="number"
          className="w-1/2 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
          value={heightCm}
          onChange={(e) => setHeightCm(Number(e.target.value) || 40)}
          title="Alto cm"
        />
      </div>
      <textarea
        className="w-full rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[9px]"
        rows={3}
        placeholder="<svg …>"
        value={svg}
        onChange={(e) => setSvg(e.target.value)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="inline-flex w-full items-center justify-center gap-1 rounded border border-slate-300 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <IconPlus size={12} /> Crear elemento + stock
      </button>
    </div>
  );
}
