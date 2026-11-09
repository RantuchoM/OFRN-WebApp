import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { MAIL_PLANTILLA_FAMILIAS } from "../../utils/mailPlantillaSchemas";
import {
  defaultsForSchema,
  listMailPlantillas,
  mergePlantillasWithSchemas,
  upsertMailPlantilla,
} from "../../services/mailPlantillasService";
import {
  IconBold,
  IconItalic,
  IconMail,
  IconRefresh,
  IconSave,
  IconUnderline,
} from "../../components/ui/Icons";

const TEXT_COLORS = [
  { label: "Negro", value: "#111827" },
  { label: "Gris", value: "#64748b" },
  { label: "Índigo", value: "#4f46e5" },
  { label: "Rojo", value: "#dc2626" },
  { label: "Verde", value: "#15803d" },
  { label: "Ámbar", value: "#b45309" },
];

function PlaceholderChips({ placeholders = [], onInsert }) {
  if (!placeholders.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {placeholders.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onInsert(`{${p}}`)}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
          title={`Insertar {${p}}`}
        >
          {`{${p}}`}
        </button>
      ))}
    </div>
  );
}

/** Barra de formato in-place (negrita / cursiva / subrayado / color). */
function FormatToolbar({ disabled }) {
  const run = (cmd, value = null) => {
    // Conservar foco del contenteditable
    document.execCommand(cmd, false, value);
  };

  const btnClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40";

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onMouseDown={(e) => {
        // Evita que el click robe el foco del contenteditable
        e.preventDefault();
      }}
    >
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Formato
      </span>
      <button
        type="button"
        disabled={disabled}
        className={btnClass}
        title="Negrita"
        onClick={() => run("bold")}
      >
        <IconBold size={14} />
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass}
        title="Cursiva"
        onClick={() => run("italic")}
      >
        <IconItalic size={14} />
      </button>
      <button
        type="button"
        disabled={disabled}
        className={btnClass}
        title="Subrayado"
        onClick={() => run("underline")}
      >
        <IconUnderline size={14} />
      </button>
      <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
      {TEXT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          disabled={disabled}
          title={c.label}
          className="h-7 w-7 rounded-md border border-slate-200 shadow-sm disabled:opacity-40"
          style={{ backgroundColor: c.value }}
          onClick={() => run("foreColor", c.value)}
        />
      ))}
      <label
        className={`${btnClass} cursor-pointer`}
        title="Color personalizado"
      >
        <span className="text-[10px] font-bold">A</span>
        <input
          type="color"
          className="sr-only"
          disabled={disabled}
          defaultValue="#4f46e5"
          onChange={(e) => run("foreColor", e.target.value)}
        />
      </label>
    </div>
  );
}

/** Inserta texto en el contenteditable enfocado (o al final del nodo). */
function insertAtCaret(el, text) {
  if (!el) return;
  el.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
    el.append(document.createTextNode(text));
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function Editable({
  field,
  className = "",
  children,
  onFocusField,
  as: Tag = "div",
}) {
  return (
    <Tag
      data-field={field}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none rounded-sm ring-indigo-300 focus:ring-2 focus:bg-indigo-50/60 empty:min-h-[1.2em] ${className}`}
      onFocus={() => onFocusField?.(field)}
      dangerouslySetInnerHTML={{ __html: children || "" }}
    />
  );
}

function StructWho({ label, value, tone = "indigo" }) {
  const tones = {
    indigo: { border: "#4f46e5", bg: "#f3f4f6" },
    amber: { border: "#f59e0b", bg: "#fef3c7" },
    green: { border: "#16a34a", bg: "#dcfce7" },
    blue: { border: "#2563eb", bg: "#dbeafe" },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div
      className="mb-3 rounded-md p-3.5 text-[14px]"
      style={{ borderLeft: `5px solid ${t.border}`, backgroundColor: t.bg }}
    >
      <strong>{label}:</strong>{" "}
      <span className="font-mono text-[13px] text-slate-700">{value}</span>
    </div>
  );
}

function StructRows({ rows }) {
  return (
    <table className="my-2 w-full border-collapse text-[14px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="w-36 border-b border-slate-100 py-2 align-top font-bold text-slate-600">
              {r.label}:
            </td>
            <td className="border-b border-slate-100 py-2 align-top font-medium text-slate-900">
              <span className="font-mono text-[13px] text-indigo-800">
                {r.value}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StructNote({ title, children, accent = "#4f46e5" }) {
  return (
    <div
      className="mt-3 rounded p-2.5"
      style={{
        borderLeft: `3px solid ${accent}`,
        backgroundColor: "#f9fafb",
      }}
    >
      <div className="mb-1 text-xs font-bold uppercase text-slate-600">
        {title}
      </div>
      <div className="font-mono text-[13px] text-slate-700">{children}</div>
    </div>
  );
}

/** Bloques fijos del mail real (obra, cargador, fechas…) — no editables. */
function StructuralMailBlock({ templateId, placement }) {
  if (templateId === "nueva_obra" && placement === "after_title") {
    return (
      <>
        <StructWho label="Cargada por" value="{nombre}" />
        <StructRows
          rows={[
            { label: "Título", value: "{titulo}" },
            { label: "Compositores", value: "{compositores}" },
            { label: "Arregladores", value: "{arregladores}" },
            { label: "Duración", value: "{duracion} min" },
            { label: "Instrumentación", value: "{instrumentacion}" },
            { label: "Estado", value: "{estado}" },
            { label: "Año", value: "{anio}" },
            { label: "Link Drive", value: "{link_drive}" },
            { label: "Link Audio/Video", value: "{link_youtube}" },
          ]}
        />
        <StructNote title="Observaciones (públicas)">
          {"{observaciones}"}
        </StructNote>
        <StructNote title="Comentarios (internos)">
          {"{comentarios}"}
        </StructNote>
      </>
    );
  }

  if (templateId === "encargo_arreglo" && placement === "after_title") {
    return <StructWho label="Asignado por" value="{nombre}" tone="amber" />;
  }
  if (templateId === "encargo_arreglo" && placement === "after_intro") {
    return (
      <>
        <StructRows
          rows={[
            { label: "Título", value: "{titulo}" },
            { label: "Solicitado por", value: "{solicitado_por}" },
            { label: "Arreglador asignado", value: "{arreglador}" },
            { label: "ID obra", value: "{id_obra}" },
            { label: "Fecha estimada", value: "{fecha_esperada}" },
            { label: "Dificultad", value: "{dificultad}" },
            { label: "Orgánico", value: "{instrumentacion}" },
            { label: "Link Drive", value: "{link_drive}" },
          ]}
        />
        <StructNote title="Observaciones" accent="#f59e0b">
          {"{observaciones}"}
        </StructNote>
      </>
    );
  }

  if (templateId === "encargo_ajuste" && placement === "after_title") {
    return <StructWho label="Asignado por" value="{nombre}" tone="amber" />;
  }
  if (templateId === "encargo_ajuste" && placement === "after_intro") {
    return (
      <>
        <StructRows
          rows={[
            { label: "Título", value: "{titulo}" },
            { label: "Tipo", value: "{tipo}" },
            { label: "Solicitado por", value: "{solicitado_por}" },
            { label: "Arreglador", value: "{arreglador}" },
            { label: "ID obra", value: "{id_obra}" },
            { label: "ID ajuste", value: "{id_ajuste}" },
            { label: "Fecha estimada", value: "{fecha_esperada}" },
            { label: "Carpeta obra", value: "{link_drive}" },
          ]}
        />
        <StructNote title="Brief" accent="#f59e0b">
          {"{brief}"}
        </StructNote>
        <StructNote title="Partes afectadas" accent="#f59e0b">
          {"{partes_afectadas}"}
        </StructNote>
      </>
    );
  }

  if (templateId === "versionado_arreglo" && placement === "after_title") {
    return (
      <>
        <StructWho label="Tipo" value="{tipo_label}" />
        <p className="my-2">
          <strong>Título:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{titulo}"}
          </span>
        </p>
        <p className="my-2 font-mono text-[13px] font-bold text-indigo-600">
          {"{link_drive}"}
        </p>
        <StructNote title="Observación del arreglador" accent="#94a3b8">
          {"{observacion}"}
        </StructNote>
      </>
    );
  }

  if (templateId === "ajuste_entregado" && placement === "after_intro") {
    return (
      <>
        <p className="my-2">
          <strong>Título:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{titulo}"}
          </span>
        </p>
        <p className="my-1 text-[14px]">
          <strong>ID obra:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{id_obra}"}
          </span>
        </p>
        <p className="my-1 text-[14px]">
          <strong>ID ajuste:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{id_ajuste}"}
          </span>
        </p>
        <p className="my-2 font-mono text-[13px] font-bold text-green-700">
          {"{link_drive}"}
        </p>
        <StructNote title="Archivos creados" accent="#94a3b8">
          {"{archivos[]}"}
        </StructNote>
        <StructNote title="Nota" accent="#94a3b8">
          {"{observacion}"}
        </StructNote>
      </>
    );
  }

  if (templateId === "obra_entregada" && placement === "after_intro") {
    return (
      <>
        <p className="my-2">
          <strong>Título:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{titulo}"}
          </span>
        </p>
        <p className="my-1 text-[14px]">
          <strong>ID obra:</strong>{" "}
          <span className="font-mono text-[13px] text-indigo-800">
            {"{id_obra}"}
          </span>
        </p>
        <p className="my-2 font-mono text-[13px] font-bold text-blue-700">
          {"{link_drive}"}
        </p>
      </>
    );
  }

  if (templateId === "cambio_fechas_gira" && placement === "after_lead") {
    return (
      <>
        <div
          className="my-3 rounded p-3.5 text-[14px]"
          style={{
            borderLeft: "4px solid #f97316",
            backgroundColor: "#fff7ed",
          }}
        >
          <p className="m-0 mb-2">
            <strong>Zona:</strong>{" "}
            <span className="font-mono text-[13px] text-indigo-800">
              {"{zona}"}
            </span>
          </p>
          <p className="m-0 mb-2">
            <strong>Fechas anteriores:</strong>{" "}
            <span className="font-mono text-[13px] text-indigo-800">
              {"{fechas_viejas}"}
            </span>
          </p>
          <p className="m-0">
            <strong>Nuevas fechas:</strong>{" "}
            <span className="font-mono text-[13px] text-indigo-800">
              {"{fechas_nuevas}"}
            </span>
          </p>
        </div>
        <p className="my-2 text-[14px] text-slate-600">
          Lista de conciertos (si hay) y enlace a la gira:
        </p>
        <p className="my-1 font-mono text-[13px] font-bold text-blue-600">
          {"{link_gira}"}
        </p>
      </>
    );
  }

  if (templateId === "convocatoria_gira" && placement === "after_lead") {
    return (
      <p className="my-3 rounded bg-slate-50 p-2.5 text-[13px] text-slate-600">
        <strong>Fechas:</strong> {"{fecha_desde}"} – {"{fecha_hasta}"}
        &nbsp;|&nbsp; <strong>Zona:</strong> {"{zona}"}
      </p>
    );
  }

  return null;
}

/**
 * Cuerpo de mail editable in-place (mismo look que el catálogo HTML).
 * Los valores con placeholders se editan crudos ({gira}, etc.).
 * Los datos de obra / cargador / fechas son estructurales (no editables).
 */
function MailBodyEditor({ draft, slotKeys, onFocusField, bodyRef, templateId }) {
  const has = (k) => slotKeys.has(k);
  const s = draft?.slots || {};

  return (
    <div
      ref={bodyRef}
      className="mail-edit-body mx-auto max-w-xl rounded-md bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-800 shadow-sm"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      <div
        className="rounded p-3.5"
        style={{
          borderLeft: "4px solid #4f46e5",
          backgroundColor: "#f5f3ff",
        }}
      >
        {has("titulo_interno") && (
          <Editable
            as="h2"
            field="titulo_interno"
            className="mb-2 mt-0 text-xl font-bold text-slate-900"
            onFocusField={onFocusField}
          >
            {s.titulo_interno}
          </Editable>
        )}
        {has("titulo_caja") && (
          <Editable
            as="h2"
            field="titulo_caja"
            className="mb-2 mt-0 text-xl font-bold text-slate-900"
            onFocusField={onFocusField}
          >
            {s.titulo_caja}
          </Editable>
        )}

        <StructuralMailBlock templateId={templateId} placement="after_title" />

        {has("saludo") && (
          <Editable
            as="p"
            field="saludo"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.saludo}
          </Editable>
        )}
        {has("intro") && (
          <Editable
            as="p"
            field="intro"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.intro}
          </Editable>
        )}

        <StructuralMailBlock templateId={templateId} placement="after_intro" />

        {has("lead") && (
          <Editable
            as="p"
            field="lead"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.lead}
          </Editable>
        )}

        <StructuralMailBlock templateId={templateId} placement="after_lead" />

        {has("reason") && (
          <div className="my-2.5 rounded border-l-4 border-amber-400 bg-amber-50 p-2.5 text-[13px]">
            <strong>Motivo:</strong>{" "}
            <Editable
              as="span"
              field="reason"
              className="inline"
              onFocusField={onFocusField}
            >
              {s.reason}
            </Editable>
          </div>
        )}

        {has("footnote") && (
          <Editable
            as="p"
            field="footnote"
            className="my-2.5 rounded border-l-4 border-slate-300 bg-slate-50 p-2.5 text-[13px] text-slate-600"
            onFocusField={onFocusField}
          >
            {s.footnote}
          </Editable>
        )}

        {has("aviso_fecha") && (
          <Editable
            as="p"
            field="aviso_fecha"
            className="my-2 rounded border-l-4 border-orange-400 bg-orange-50 p-2.5 text-[13px]"
            onFocusField={onFocusField}
          >
            {s.aviso_fecha}
          </Editable>
        )}

        {has("aclaracion_comidas") && (
          <Editable
            as="p"
            field="aclaracion_comidas"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.aclaracion_comidas}
          </Editable>
        )}
        {has("aclaracion_rendibles") && (
          <Editable
            as="p"
            field="aclaracion_rendibles"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.aclaracion_rendibles}
          </Editable>
        )}

        {has("cuerpo") && (
          <Editable
            as="p"
            field="cuerpo"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.cuerpo}
          </Editable>
        )}

        {has("link_texto") && (
          <p className="my-2">
            <Editable
              as="span"
              field="link_texto"
              className="font-bold text-indigo-600 underline"
              onFocusField={onFocusField}
            >
              {s.link_texto}
            </Editable>
          </p>
        )}

        {has("cta_ayuda") && (
          <Editable
            as="p"
            field="cta_ayuda"
            className="my-2 text-[13px] text-indigo-900"
            onFocusField={onFocusField}
          >
            {s.cta_ayuda}
          </Editable>
        )}

        {has("cierre") && (
          <Editable
            as="p"
            field="cierre"
            className="my-2"
            onFocusField={onFocusField}
          >
            {s.cierre}
          </Editable>
        )}

        {(has("firma_nombre") || has("firma_cargo") || has("firma_org")) && (
          <div className="mt-4 border-t border-slate-200 pt-3 text-[13px] text-slate-600">
            {has("firma_nombre") && (
              <Editable
                as="div"
                field="firma_nombre"
                className="font-bold text-slate-700"
                onFocusField={onFocusField}
              >
                {s.firma_nombre}
              </Editable>
            )}
            {has("firma_cargo") && (
              <Editable
                as="div"
                field="firma_cargo"
                onFocusField={onFocusField}
              >
                {s.firma_cargo}
              </Editable>
            )}
            {has("firma_org") && (
              <Editable
                as="div"
                field="firma_org"
                onFocusField={onFocusField}
              >
                {s.firma_org}
              </Editable>
            )}
          </div>
        )}
      </div>

      {has("footer") && (
        <Editable
          as="p"
          field="footer"
          className="mt-3 text-xs text-slate-500"
          onFocusField={onFocusField}
        >
          {s.footer}
        </Editable>
      )}
    </div>
  );
}

function readSlotsFromBody(root, slotKeys) {
  const slots = {};
  for (const key of slotKeys) {
    const el = root.querySelector(`[data-field="${key}"]`);
    if (!el) continue;
    // Siempre HTML para conservar negrita / cursiva / color
    slots[key] = el.innerHTML.trim();
  }
  return slots;
}

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function plantillaSearchBlob(item) {
  const parts = [
    item.titulo,
    item.asunto,
    item.template_id,
    item.variant_key,
    item.schema?.familia,
    ...Object.values(item.slots || {}).map(stripHtml),
  ];
  return parts.join("\n").toLowerCase();
}

export default function MailPlantillasHub({ supabase, actorId = null }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** null = pantalla de categorías */
  const [familiaFilter, setFamiliaFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState(null);
  const [focusField, setFocusField] = useState("asunto");
  const [editorKey, setEditorKey] = useState(0);
  const bodyRef = useRef(null);
  const asuntoRef = useRef(null);

  const merged = useMemo(() => mergePlantillasWithSchemas(rows), [rows]);

  const countsByFamilia = useMemo(() => {
    const map = Object.fromEntries(
      MAIL_PLANTILLA_FAMILIAS.map((f) => [f.id, 0]),
    );
    for (const m of merged) {
      const id = m.schema?.familia;
      if (id in map) map[id] += 1;
    }
    return map;
  }, [merged]);

  const searchNorm = searchQuery.trim().toLowerCase();
  const showingCategories = familiaFilter == null && !searchNorm;

  const filtered = useMemo(() => {
    // Con búsqueda: siempre todas las plantillas. Sin búsqueda: solo la categoría abierta.
    let list = merged;
    if (searchNorm) {
      return list.filter((m) => plantillaSearchBlob(m).includes(searchNorm));
    }
    if (familiaFilter) {
      list = list.filter((m) => m.schema.familia === familiaFilter);
    }
    return list;
  }, [merged, familiaFilter, searchNorm]);

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return (
      merged.find(
        (m) => `${m.template_id}::${m.variant_key}` === selectedKey,
      ) || null
    );
  }, [merged, selectedKey]);

  const slotKeys = useMemo(
    () => new Set((selected?.schema?.slotDefs || []).map((d) => d.key)),
    [selected?.schema?.slotDefs],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMailPlantillas(supabase);
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudieron cargar las plantillas");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft({
      titulo: selected.titulo,
      asunto: selected.asunto,
      slots: { ...selected.slots },
    });
    setEditorKey((k) => k + 1);
  }, [selected?.template_id, selected?.variant_key, selected?.updated_at]);

  const openFamilia = (familiaId) => {
    setFamiliaFilter(familiaId);
    setSelectedKey(null);
  };

  const backToCategorias = () => {
    setFamiliaFilter(null);
    setSelectedKey(null);
    setSearchQuery("");
  };

  const syncDraftFromDom = useCallback(() => {
    if (!bodyRef.current || !draft) return draft;
    const fromBody = readSlotsFromBody(bodyRef.current, slotKeys);
    const asuntoEl = asuntoRef.current;
    const asunto = asuntoEl
      ? (asuntoEl.innerText || asuntoEl.textContent || "").trim()
      : draft.asunto;
    return {
      ...draft,
      asunto,
      slots: { ...draft.slots, ...fromBody },
    };
  }, [draft, slotKeys]);

  const insertPlaceholder = (token) => {
    if (focusField === "asunto" && asuntoRef.current) {
      insertAtCaret(asuntoRef.current, token);
      return;
    }
    const el = bodyRef.current?.querySelector(`[data-field="${focusField}"]`);
    if (el) {
      insertAtCaret(el, token);
      return;
    }
    // fallback: append to current draft field
    setDraft((d) => {
      if (!d) return d;
      if (focusField === "asunto") {
        return { ...d, asunto: `${d.asunto || ""}${token}` };
      }
      return {
        ...d,
        slots: {
          ...d.slots,
          [focusField]: `${d.slots?.[focusField] || ""}${token}`,
        },
      };
    });
    setEditorKey((k) => k + 1);
  };

  const handleSave = async () => {
    if (!selected || !draft) return;
    const synced = syncDraftFromDom();
    setSaving(true);
    try {
      await upsertMailPlantilla(supabase, {
        templateId: selected.template_id,
        variantKey: selected.variant_key,
        titulo: synced.titulo,
        asunto: synced.asunto,
        slots: synced.slots,
        updatedBy: actorId,
      });
      toast.success("Plantilla guardada. Los próximos envíos ya usan este texto.");
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = () => {
    if (!selected) return;
    const defaults = defaultsForSchema(
      selected.template_id,
      selected.variant_key,
    );
    if (!defaults) return;
    setDraft({
      titulo: defaults.titulo,
      asunto: defaults.asunto,
      slots: { ...defaults.slots },
    });
    setEditorKey((k) => k + 1);
    toast.success("Defaults restaurados en el editor (guardá para aplicar)");
  };

  if (loading && !merged.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Cargando plantillas…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:flex-row md:p-4">
      <aside className="flex max-h-[38vh] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:max-h-none md:h-full md:w-72 lg:w-80">
        <div className="border-b border-slate-100 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <IconMail size={16} /> Plantillas de mails
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar palabra en textos…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          {!showingCategories && (
            <button
              type="button"
              onClick={backToCategorias}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              ← Categorías
            </button>
          )}
          {familiaFilter && !searchNorm && (
            <div className="text-[11px] font-semibold text-slate-500">
              {MAIL_PLANTILLA_FAMILIAS.find((f) => f.id === familiaFilter)
                ?.label || familiaFilter}
            </div>
          )}
          {searchNorm && (
            <div className="text-[11px] text-slate-500">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"} en
              todas las plantillas
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {showingCategories ? (
            MAIL_PLANTILLA_FAMILIAS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => openFamilia(f.id)}
                className="mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="text-xs font-bold leading-snug">{f.label}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {countsByFamilia[f.id] || 0}
                </span>
              </button>
            ))
          ) : filtered.length === 0 ? (
            <div className="px-2.5 py-6 text-center text-xs text-slate-400">
              Ninguna plantilla coincide.
            </div>
          ) : (
            filtered.map((item) => {
              const key = `${item.template_id}::${item.variant_key}`;
              const active =
                key === `${selected?.template_id}::${selected?.variant_key}`;
              const familiaLabel = MAIL_PLANTILLA_FAMILIAS.find(
                (f) => f.id === item.schema.familia,
              )?.label;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-bold leading-snug">
                    {item.titulo}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {item.template_id}
                    {item.variant_key ? ` · ${item.variant_key}` : ""}
                  </div>
                  {searchNorm && familiaLabel && (
                    <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                      {familiaLabel}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!selected || !draft ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {showingCategories
              ? "Elegí una categoría a la izquierda, o buscá una palabra."
              : "Elegí una plantilla de la lista."}
          </div>
        ) : (
          <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-sm">
            {/* Meta header */}
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 bg-slate-900 px-4 py-3 text-slate-200">
              <div>
                <div className="text-sm font-bold text-white">
                  {selected.titulo}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                  {selected.template_id}
                  {selected.variant_key ? ` · ${selected.variant_key}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRestore}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  <IconRefresh size={14} /> Defaults
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  <IconSave size={14} /> {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">
                Editá <strong>dentro del mail</strong>. Seleccioná texto y usá
                formato (negrita, cursiva, subrayado, color). Los{" "}
                {"{placeholders}"} se reemplazan al enviar. Fechas / bloques
                estructurales no se tocan.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <FormatToolbar disabled={focusField === "asunto"} />
                <PlaceholderChips
                  placeholders={selected.schema.placeholders}
                  onInsert={insertPlaceholder}
                />
              </div>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Título en el listado
                </span>
                <input
                  value={draft.titulo}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, titulo: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
              </label>
            </div>

            {/* Asunto — como el catálogo */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Asunto
              </span>
              <div
                key={`asunto-${editorKey}`}
                ref={asuntoRef}
                data-field="asunto"
                contentEditable
                suppressContentEditableWarning
                className="rounded-sm text-sm font-semibold text-slate-900 outline-none ring-indigo-300 focus:ring-2 focus:bg-indigo-50/50"
                onFocus={() => setFocusField("asunto")}
              >
                {draft.asunto}
              </div>
            </div>

            {/* Cuerpo editable — scroll propio */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-200 p-4 md:p-5">
              <MailBodyEditor
                key={editorKey}
                draft={draft}
                slotKeys={slotKeys}
                onFocusField={setFocusField}
                bodyRef={bodyRef}
                templateId={selected.template_id}
              />
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
