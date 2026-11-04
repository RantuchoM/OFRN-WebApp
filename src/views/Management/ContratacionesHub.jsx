import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  IconLoader,
  IconPlus,
  IconRefresh,
  IconExternalLink,
  IconTrash,
  IconEdit,
  IconPencil,
  IconX,
  IconAlertTriangle,
} from "../../components/ui/Icons";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
  GESTION_CONTRATACIONES_GIRA_MIN_DATE,
  AEREO_MODOS,
  FONDO_CODIGOS,
  PAGO_CLASES,
  pagoClaseLabel,
  buildBrutoBreakdown,
  suggestBrutoFromNeto,
  suggestComisionFromNeto,
  isComisionBelowThreshold,
  isFondoModalidadExterna,
  isFondoCaja,
} from "../../constants/gestionContrataciones";
import {
  formatProgramSelectLabel,
  getProgramTypeColor,
} from "../../utils/giraUtils";
import {
  listGestionFondos,
  listFondoAsignaciones,
  createFondoAsignacion,
  updateFondoAsignacion,
  deleteFondoAsignacion,
  saldosCuentasReemplazo,
  listMovimientosReemplazo,
  createMovimientoReemplazo,
  updateMovimientoReemplazo,
  deleteMovimientoReemplazo,
  createCuentaReemplazo,
  listProductores,
  createProductor,
  listExpedientes,
  createExpediente,
  updateExpediente,
  listContrataciones,
  updateContratacion,
  listPagos,
  createPago,
  updatePago,
  deletePago,
  listGirasElegiblesGestion,
} from "../../services/gestionContratacionesService";

const TABS = [
  { id: "fondos", label: "Fondos / cobros" },
  { id: "cuentas", label: "Cuentas / R" },
  { id: "expedientes", label: "Expedientes" },
  { id: "contrataciones", label: "Contrataciones" },
  { id: "pagos", label: "Pagos / Gastos" },
  { id: "productores", label: "Productores" },
];

const LOAD_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatFechaCorta(iso) {
  if (!iso) return null;
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function giraSearchHaystack(prog) {
  if (!prog) return "";
  return [
    giraLabel(prog),
    prog.nomenclador,
    prog.mes_letra,
    prog.nombre_gira,
    prog.zona,
    prog.tipo,
    prog.id,
    formatFechaCorta(prog.fecha_desde),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function giraLabel(prog) {
  if (!prog) return null;
  const fecha = formatFechaCorta(prog.fecha_desde);
  const meta = formatProgramSelectLabel(prog);
  if (fecha && meta) return `${fecha} · ${meta}`;
  if (fecha) return fecha;
  if (meta) return meta;
  return prog.id != null ? `Gira #${prog.id}` : null;
}

function GiraSelect({
  value,
  onChange,
  giras,
  className = "",
  allowEmpty = true,
  emptyLabel = "Sin gira",
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = React.useRef(null);
  const selected = useMemo(
    () => (giras || []).find((g) => String(g.id) === String(value)),
    [giras, value],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return giras || [];
    return (giras || []).filter((g) => giraSearchHaystack(g).includes(needle));
  }, [giras, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const emit = (nextId) => {
    onChange?.({ target: { value: nextId == null ? "" : String(nextId) } });
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={rootRef} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs hover:border-slate-300"
      >
        <span className="min-w-0 truncate">
          {selected ? (
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 ${getProgramTypeColor(selected.tipo)}`}
            >
              <span className="truncate font-semibold">{giraLabel(selected)}</span>
            </span>
          ) : (
            <span className="text-slate-400">{emptyLabel}</span>
          )}
        </span>
        <span className="shrink-0 text-[10px] text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-[110] mt-1 max-h-64 w-full min-w-[16rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nomenclador, mes, nombre…"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
                  onClick={() => emit("")}
                >
                  {emptyLabel}
                </button>
              </li>
            )}
            {filtered.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${
                    String(g.id) === String(value) ? "bg-indigo-50" : ""
                  }`}
                  onClick={() => emit(g.id)}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[9px] font-black uppercase ${getProgramTypeColor(g.tipo)}`}
                  >
                    {(g.tipo || "General").slice(0, 8)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">
                      {giraLabel(g)}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {[g.nomenclador, g.mes_letra].filter(Boolean).join(" · ") ||
                        "—"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!filtered.length && (
              <li className="px-3 py-3 text-center text-[11px] text-slate-400">
                Sin coincidencias
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatMoneyInput(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMoneyInput(raw) {
  if (raw == null || raw === "") return null;
  const cleaned = String(raw)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function MoneyField({
  label,
  value,
  onCommit,
  placeholder,
  hint,
  className = "",
}) {
  const [text, setText] = useState(() =>
    value == null || value === "" ? "" : formatMoneyInput(value),
  );
  useEffect(() => {
    setText(value == null || value === "" ? "" : formatMoneyInput(value));
  }, [value]);
  return (
    <div className={className}>
      {label ? (
        <label className="text-[10px] font-bold uppercase text-slate-500">
          {label}
        </label>
      ) : null}
      <div className="relative mt-0.5">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
          $
        </span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = parseMoneyInput(text);
            onCommit?.(n);
            setText(n == null ? "" : formatMoneyInput(n));
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-6 pr-2.5 text-right text-sm font-bold tabular-nums shadow-sm"
          inputMode="decimal"
        />
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

function SearchableOptionPicker({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyLabel = "Elegir…",
  className = "",
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = React.useRef(null);
  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) =>
      String(o.searchText || o.label || "")
        .toLowerCase()
        .includes(needle),
    );
  }, [options, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-xs"
      >
        <span className="truncate">
          {selected?.label || (
            <span className="text-slate-400">{emptyLabel}</span>
          )}
        </span>
        <span className="text-[10px] text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-[110] mt-1 max-h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
          </div>
          <ul className="max-h-40 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQ("");
                }}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {!filtered.length && (
              <li className="px-3 py-2 text-center text-[11px] text-slate-400">
                Sin coincidencias
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function expedienteLabel(ex) {
  if (!ex) return "—";
  const parts = [
    ex.nombre,
    ex.numero_expediente ? `Nº ${ex.numero_expediente}` : null,
    !ex.nombre
      ? ex.titular_nombre || ex.gestion_productores?.nombre || null
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : `#${ex.id}`;
}

function expedienteGiraLabel(ex) {
  if (!ex) return null;
  return giraLabel(ex.programas) || null;
}

function artistaLabel(c) {
  const art = c?.giras_integrantes?.integrantes;
  if (art) return `${art.apellido || ""}, ${art.nombre || ""}`.trim();
  return `GI #${c?.id_giras_integrantes || "?"}`;
}

function contratacionGiraLabel(c) {
  return (
    giraLabel(c?.giras_integrantes?.programas) ||
    (c?.giras_integrantes?.id_gira != null
      ? `Gira #${c.giras_integrantes.id_gira}`
      : null)
  );
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function tildeDateValue(raw) {
  if (raw == null || raw === false || raw === "") return null;
  if (raw === true) return todayISODate();
  const d = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function fondoById(fondos, idFondo) {
  if (!idFondo) return null;
  return (fondos || []).find((x) => String(x.id) === String(idFondo)) || null;
}

function isFondoReemplazos(fondos, idFondo) {
  return fondoById(fondos, idFondo)?.codigo === FONDO_CODIGOS.REEMPLAZOS;
}

function fondoOptionLabel(f) {
  if (!f) return "";
  if (isFondoModalidadExterna(f.codigo)) return `${f.nombre} (modalidad)`;
  if (isFondoCaja(f.codigo)) return `${f.nombre} (caja)`;
  return f.nombre;
}

/** Monto de referencia del expediente (bruto a facturar o sugerido). */
function expedienteMontoReferencia(ex, contrataciones) {
  if (!ex) return 0;
  if (ex.monto_bruto_facturar != null && ex.monto_bruto_facturar !== "") {
    return Number(ex.monto_bruto_facturar) || 0;
  }
  const neto = (contrataciones || [])
    .filter((c) => String(c.id_expediente) === String(ex.id))
    .reduce((s, c) => s + (Number(c.cachet_ars) || 0), 0);
  return suggestBrutoFromNeto(neto, ex.monto_miscelaneo);
}

function expedienteEstaPagado(ex) {
  return Boolean(tildeDateValue(ex?.fecha_pago_efectuado));
}

function cuentaOptionLabel(c) {
  const s = Number(c?.saldo);
  const saldoTxt = Number.isFinite(s) ? ` · saldo $${money(s)}` : "";
  return `${c?.nombre || "Cuenta"}${saldoTxt}`;
}

/** Selector de cuenta de reemplazos; muestra saldo actual en cada opción. */
function CuentaReemplazoSelect({
  value,
  onChange,
  cuentas,
  className = "rounded border border-slate-200 bg-white px-1.5 py-1 text-xs",
  required = false,
  emptyLabel = "Cuenta…",
}) {
  return (
    <select
      value={value || ""}
      onChange={(e) =>
        onChange(e.target.value ? Number(e.target.value) : null)
      }
      className={className}
      required={required}
      title="Cuenta de reemplazos y saldo actual"
    >
      <option value="">{emptyLabel}</option>
      {(cuentas || []).map((c) => (
        <option key={c.id} value={c.id}>
          {cuentaOptionLabel(c)}
        </option>
      ))}
    </select>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <nav
      aria-label="Secciones de gestión"
      className="-mx-1 border-b border-slate-200"
    >
      <div
        role="tablist"
        className="flex gap-0 overflow-x-auto px-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "text-indigo-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function ContratacionesHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("sub") || "expedientes";
  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set("sub", id);
    setSearchParams(next, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [fondos, setFondos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productores, setProductores] = useState([]);
  const [expedientes, setExpedientes] = useState([]);
  const [contrataciones, setContrataciones] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [giras, setGiras] = useState([]);

  const [expFilterEstado, setExpFilterEstado] = useState("");
  const [expFilterTil, setExpFilterTil] = useState("");
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [f, a, c, m, p, e, ct, pg, g] = await withTimeout(
        Promise.all([
          listGestionFondos(),
          listFondoAsignaciones(),
          saldosCuentasReemplazo(),
          listMovimientosReemplazo(),
          listProductores(),
          listExpedientes(),
          listContrataciones(),
          listPagos(),
          listGirasElegiblesGestion(),
        ]),
        LOAD_TIMEOUT_MS,
        "Supabase no respondió a tiempo. Revisá conectividad o el estado del proyecto.",
      );
      setFondos(f || []);
      setAsignaciones(a || []);
      setCuentas(c || []);
      setMovimientos(m || []);
      setProductores(p || []);
      setExpedientes(e || []);
      setContrataciones(ct || []);
      setPagos(pg || []);
      setGiras(g || []);
    } catch (err) {
      const msg =
        err?.message || "Error al cargar contrataciones";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const expedientesFiltrados = useMemo(() => {
    return (expedientes || []).filter((ex) => {
      if (expFilterTil === "firma" && !ex.firma_nota) return false;
      if (expFilterTil === "doc" && !ex.documentacion) return false;
      if (expFilterTil === "fact" && !ex.facturacion) return false;
      if (expFilterTil === "adm" && !ex.enviado_adm) return false;
      if (expFilterTil === "sin_firma" && ex.firma_nota) return false;
      if (
        expFilterEstado &&
        !(ex.ultimo_estado_conocido || "")
          .toLowerCase()
          .includes(expFilterEstado.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [expedientes, expFilterEstado, expFilterTil]);

  const aereoPendientes = useMemo(
    () =>
      (contrataciones || []).filter(
        (c) =>
          !c.aereo_modo &&
          (String(c.giras_integrantes?.funcion || "")
            .toLowerCase()
            .includes("director") ||
            String(c.giras_integrantes?.funcion || "")
              .toLowerCase()
              .includes("solista") ||
            String(c.giras_integrantes?.rol || "")
              .toLowerCase()
              .includes("director") ||
            String(c.giras_integrantes?.rol || "")
              .toLowerCase()
              .includes("solista")),
      ),
    [contrataciones],
  );

  if (loading && !fondos.length && !loadError) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
        <IconLoader size={18} className="animate-spin" />
        Cargando…
      </div>
    );
  }

  if (loadError && !fondos.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="max-w-md text-sm text-rose-700">{loadError}</p>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <IconRefresh size={14} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 sm:p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            Piloto desde giras ≥ {GESTION_CONTRATACIONES_GIRA_MIN_DATE}. No
            aplica a FIMBA.
          </p>
          {aereoPendientes.length > 0 && (
            <p className="mt-1 text-xs font-bold text-amber-700">
              {aereoPendientes.length} contratación(es) sin modo aéreo
              (director/solista).
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <IconRefresh size={14} />
          Actualizar
        </button>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "fondos" && (
          <FondosPanel
            fondos={fondos}
            asignaciones={asignaciones}
            pagos={pagos}
            contrataciones={contrataciones}
            expedientes={expedientes}
            movimientosReemplazo={movimientos}
            onAsignar={async (payload) => {
              await createFondoAsignacion(payload);
              toast.success("Asignación registrada");
              reload();
            }}
            onPatchAsignacion={async (id, patch) => {
              await updateFondoAsignacion(id, patch);
              toast.success("Asignación actualizada");
              reload();
            }}
            onDeleteAsignacion={async (id) => {
              await deleteFondoAsignacion(id);
              toast.success("Asignación eliminada");
              reload();
            }}
          />
        )}
        {tab === "cuentas" && (
          <CuentasPanel
            cuentas={cuentas}
            movimientos={movimientos}
            expedientes={expedientes}
            onCreateCuenta={async (nombre) => {
              await createCuentaReemplazo({ nombre });
              toast.success("Cuenta creada");
              reload();
            }}
            onCreateMov={async (row) => {
              await createMovimientoReemplazo(row);
              toast.success("Movimiento creado");
              reload();
            }}
            onPatchMov={async (id, patch) => {
              await updateMovimientoReemplazo(id, patch);
              toast.success("Movimiento actualizado");
              reload();
            }}
            onDeleteMov={async (id) => {
              await deleteMovimientoReemplazo(id);
              toast.success("Movimiento eliminado");
              reload();
            }}
          />
        )}
        {tab === "expedientes" && (
          <ExpedientesPanel
            expedientes={expedientesFiltrados}
            productores={productores}
            fondos={fondos}
            cuentas={cuentas}
            giras={giras}
            contrataciones={contrataciones}
            pagos={pagos}
            filterEstado={expFilterEstado}
            setFilterEstado={setExpFilterEstado}
            filterTil={expFilterTil}
            setFilterTil={setExpFilterTil}
            onCreate={async (row) => {
              await createExpediente(row);
              toast.success("Expediente creado");
              reload();
            }}
            onPatch={async (id, patch) => {
              await updateExpediente(id, patch);
              toast.success("Expediente guardado");
              reload();
            }}
            onLinkContratacion={async (contratacionId, idExpediente) => {
              await updateContratacion(contratacionId, {
                id_expediente: idExpediente,
              });
              toast.success("Artista vinculado al expediente");
              reload();
            }}
            onLinkPago={async (pagoId, idExpediente) => {
              await updatePago(pagoId, { id_expediente: idExpediente });
              toast.success("Pago vinculado al expediente");
              reload();
            }}
            onCreatePago={async (row) => {
              await createPago(row);
              toast.success(
                row?.clase === "gasto" ? "Gasto creado" : "Pago creado",
              );
              reload();
            }}
            onPatchPago={async (id, patch) => {
              await updatePago(id, patch);
              toast.success("Actualizado");
              reload();
            }}
            onDeletePago={async (id) => {
              await deletePago(id);
              toast.success("Eliminado");
              reload();
            }}
            onCreateProductor={async (row) => {
              const created = await createProductor(row);
              toast.success("Productor creado");
              await reload();
              return created;
            }}
          />
        )}
        {tab === "contrataciones" && (
          <ContratacionesPanel
            rows={contrataciones}
            expedientes={expedientes}
            fondos={fondos}
            onPatch={async (id, patch) => {
              await updateContratacion(id, patch);
              toast.success("Contratación actualizada");
              reload();
            }}
            onRegistrarAereoComoGasto={async (contratacion) => {
              const detalle = contratacion.aereo_detalle || {};
              const idExpediente = contratacion.id_expediente;
              if (!idExpediente) {
                toast.error(
                  "Asociá primero la contratación a un expediente; el aéreo se registra como gasto ahí.",
                );
                return;
              }
              const nombreArtista = artistaLabel(contratacion);
              const monto =
                detalle.costo_total != null && detalle.costo_total !== ""
                  ? Number(detalle.costo_total)
                  : (detalle.vuelos || []).reduce(
                      (s, v) => s + (Number(v.costo) || 0),
                      0,
                    );
              const created = await createPago({
                clase: "gasto",
                concepto: `Aéreo · ${nombreArtista}`,
                monto: Number.isFinite(monto) ? monto : 0,
                id_fondo: detalle.id_fondo || null,
                id_expediente: idExpediente,
                notas: detalle.notas || null,
              });
              await updateContratacion(contratacion.id, {
                aereo_detalle: {
                  ...detalle,
                  id_pago_gasto: created.id,
                  id_expediente_transporte: idExpediente,
                },
              });
              toast.success("Aéreo registrado como gasto del expediente");
              reload();
            }}
          />
        )}
        {tab === "pagos" && (
          <PagosPanel
            pagos={pagos}
            fondos={fondos}
            cuentas={cuentas}
            expedientes={expedientes}
            onCreate={async (row) => {
              await createPago(row);
              toast.success(
                row?.clase === "gasto" ? "Gasto creado" : "Pago creado",
              );
              reload();
            }}
            onPatch={async (id, patch) => {
              await updatePago(id, patch);
              toast.success("Actualizado");
              reload();
            }}
            onDelete={async (id) => {
              await deletePago(id);
              toast.success("Eliminado");
              reload();
            }}
          />
        )}
        {tab === "productores" && (
          <ProductoresPanel
            productores={productores}
            onCreate={async (row) => {
              await createProductor(row);
              toast.success("Productor creado");
              reload();
            }}
          />
        )}
      </div>
    </div>
  );
}

function FondosPanel({
  fondos,
  asignaciones,
  pagos,
  contrataciones,
  expedientes,
  movimientosReemplazo,
  onAsignar,
  onPatchAsignacion,
  onDeleteAsignacion,
}) {
  const modalidades = useMemo(
    () => (fondos || []).filter((f) => isFondoModalidadExterna(f.codigo)),
    [fondos],
  );
  const cajas = useMemo(
    () => (fondos || []).filter((f) => isFondoCaja(f.codigo)),
    [fondos],
  );
  const defaultId = modalidades[0]?.id || cajas[0]?.id || fondos?.[0]?.id || "";
  const [fondoId, setFondoId] = useState(defaultId);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (!fondoId && defaultId) setFondoId(defaultId);
  }, [defaultId, fondoId]);

  const fondoActivo = fondoById(fondos, fondoId);
  const esModalidad = isFondoModalidadExterna(fondoActivo?.codigo);

  const resumenModalidad = useMemo(() => {
    if (!fondoActivo || !esModalidad) return null;
    const fid = String(fondoActivo.id);
    const rows = (expedientes || [])
      .filter((ex) => String(ex.id_fondo) === fid)
      .map((ex) => {
        const montoRef = expedienteMontoReferencia(ex, contrataciones);
        const pagado = expedienteEstaPagado(ex);
        return {
          ex,
          monto: montoRef,
          pagado,
          fechaPago: tildeDateValue(ex.fecha_pago_efectuado),
        };
      })
      .sort((a, b) => Number(b.pagado) - Number(a.pagado) || b.monto - a.monto);
    const nosDeben = rows
      .filter((r) => !r.pagado)
      .reduce((s, r) => s + r.monto, 0);
    const pagadoTotal = rows
      .filter((r) => r.pagado)
      .reduce((s, r) => s + r.monto, 0);
    return { rows, nosDeben, pagadoTotal };
  }, [fondoActivo, esModalidad, expedientes, contrataciones]);

  const movsCaja = useMemo(() => {
    if (!fondoActivo || esModalidad) return [];
    const fid = String(fondoActivo.id);
    const rows = [];

    for (const a of asignaciones || []) {
      if (String(a.id_fondo) !== fid) continue;
      rows.push({
        key: `asig-${a.id}`,
        kind: "asignacion",
        id: a.id,
        fecha: a.fecha_asignacion || a.created_at?.slice(0, 10),
        concepto: a.notas || "Asignación / ingreso",
        monto: Number(a.monto) || 0,
        signo: 1,
        raw: a,
      });
    }

    // Solo caja: pagos/gastos restan saldo. Factura/690 no pasan por acá.
    for (const p of pagos || []) {
      if (String(p.id_fondo) !== fid) continue;
      rows.push({
        key: `pago-${p.id}`,
        kind: "pago",
        id: p.id,
        fecha: p.created_at?.slice(0, 10),
        concepto: `${pagoClaseLabel(p.clase)}: ${p.concepto}`,
        monto: Number(p.monto) || 0,
        signo: -1,
        raw: p,
      });
    }

    for (const c of contrataciones || []) {
      if (String(c.id_fondo) !== fid) continue;
      rows.push({
        key: `ctr-${c.id}`,
        kind: "contratacion",
        id: c.id,
        fecha: c.created_at?.slice(0, 10),
        concepto: `Contratación: ${artistaLabel(c)}`,
        monto: Number(c.cachet_ars) || 0,
        signo: -1,
        raw: c,
      });
    }

    for (const ex of expedientes || []) {
      if (String(ex.id_fondo_miscelaneo) !== fid) continue;
      const m = Number(ex.monto_miscelaneo) || 0;
      if (!(m > 0)) continue;
      rows.push({
        key: `misc-${ex.id}`,
        kind: "miscelaneo",
        id: ex.id,
        fecha:
          ex.fecha_pago_efectuado ||
          ex.updated_at?.slice(0, 10) ||
          ex.created_at?.slice(0, 10),
        concepto: `Misceláneo exp.: ${expedienteLabel(ex)}`,
        monto: m,
        signo: 1,
        raw: ex,
      });
    }

    if (fondoActivo.codigo === FONDO_CODIGOS.REEMPLAZOS) {
      for (const m of movimientosReemplazo || []) {
        rows.push({
          key: `rep-${m.id}`,
          kind: "reemplazo",
          id: m.id,
          fecha: m.fecha_efectuado || m.created_at?.slice(0, 10),
          concepto: `${m.concepto || "Mov. reemplazo"} · ${m.gestion_cuentas_reemplazo?.nombre || "sin cuenta"} · ${m.estado}`,
          monto: Number(m.monto) || 0,
          signo: 1,
          raw: m,
        });
      }
    }

    return rows.sort((a, b) =>
      String(b.fecha || "").localeCompare(String(a.fecha || "")),
    );
  }, [
    fondoActivo,
    esModalidad,
    asignaciones,
    pagos,
    contrataciones,
    expedientes,
    movimientosReemplazo,
  ]);

  const saldoCaja = movsCaja.reduce((s, r) => s + r.signo * r.monto, 0);
  const ingresosCaja = movsCaja
    .filter((r) => r.signo > 0)
    .reduce((s, r) => s + r.monto, 0);
  const egresosCaja = movsCaja
    .filter((r) => r.signo < 0)
    .reduce((s, r) => s + r.monto, 0);

  const renderCard = (f) => {
    const active = String(f.id) === String(fondoId);
    const modalidad = isFondoModalidadExterna(f.codigo);
    let preview = null;
    if (modalidad) {
      const fid = String(f.id);
      let deben = 0;
      let pagado = 0;
      for (const ex of expedientes || []) {
        if (String(ex.id_fondo) !== fid) continue;
        const m = expedienteMontoReferencia(ex, contrataciones);
        if (expedienteEstaPagado(ex)) pagado += m;
        else deben += m;
      }
      preview = (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums">
          <span className="font-bold text-amber-800">
            Nos deben ${money(deben)}
          </span>
          <span className="font-bold text-emerald-700">
            Pagado ${money(pagado)}
          </span>
        </div>
      );
    }
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => setFondoId(f.id)}
        className={`rounded-xl border p-3 text-left transition-colors ${
          active
            ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
            : "border-slate-200 bg-slate-50 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-slate-800">{f.nombre}</div>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
              modalidad
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {modalidad ? "Modalidad" : "Caja"}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
          {f.descripcion}
        </div>
        {preview}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-500">
        <span className="font-bold text-amber-800">Modalidad</span> (factura /
        690): no gasta caja; se sigue cuánto nos deben y cuánto ya se pagó.{" "}
        <span className="font-bold text-slate-700">Caja</span> (orquesta /
        reemplazos): sí tiene saldo; los pagos restan.
      </p>

      {modalidades.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800/80">
            Liquidación externa
          </div>
          <div className="grid gap-2 sm:grid-cols-2">{modalidades.map(renderCard)}</div>
        </div>
      )}

      {cajas.length > 0 && (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Fondos de caja
          </div>
          <div className="grid gap-2 sm:grid-cols-2">{cajas.map(renderCard)}</div>
        </div>
      )}

      {fondoActivo && esModalidad && resumenModalidad && (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-800/70">
                Nos deben (sin pago efectuado)
              </div>
              <div className="text-xl font-black tabular-nums text-amber-900">
                ${money(resumenModalidad.nosDeben)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-700/80">
                Pagado
              </div>
              <div className="text-xl font-black tabular-nums text-emerald-700">
                ${money(resumenModalidad.pagadoTotal)}
              </div>
            </div>
            {(fondoActivo.monto_recomendado != null ||
              fondoActivo.monto_maximo != null) && (
              <div className="text-[11px] font-medium text-slate-600">
                {fondoActivo.monto_recomendado != null && (
                  <span>Rec. ${money(fondoActivo.monto_recomendado)} </span>
                )}
                {fondoActivo.monto_maximo != null && (
                  <span>· Máx. ${money(fondoActivo.monto_maximo)}</span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Expediente</th>
                  <th className="px-2 py-1.5">Estado</th>
                  <th className="px-2 py-1.5">Pago efectuado</th>
                  <th className="px-2 py-1.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {resumenModalidad.rows.map(({ ex, monto: m, pagado, fechaPago }) => (
                  <tr key={ex.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-medium text-slate-800">
                      {expedienteLabel(ex)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          pagado
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {pagado ? "Pagado" : "Nos deben"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">
                      {formatFechaCorta(fechaPago) || "—"}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-bold tabular-nums ${
                        pagado ? "text-emerald-700" : "text-amber-900"
                      }`}
                    >
                      ${money(m)}
                    </td>
                  </tr>
                ))}
                {!resumenModalidad.rows.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-slate-400"
                    >
                      No hay expedientes con esta modalidad.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            Marcar <strong>fecha de pago efectuado</strong> en el expediente
            pasa el monto de «nos deben» a «pagado». No resta caja de orquesta
            ni de reemplazos.
          </p>
        </>
      )}

      {fondoActivo && !esModalidad && (
        <>
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Saldo {fondoActivo.nombre}
              </div>
              <div
                className={`text-xl font-black tabular-nums ${
                  saldoCaja < 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                ${money(saldoCaja)}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Ingresos ${money(ingresosCaja)} · Egresos ${money(egresosCaja)}
            </div>
          </div>

          {fondoActivo.codigo === FONDO_CODIGOS.ORQUESTA && (
            <form
              className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const n = Number(monto);
                if (!Number.isFinite(n)) {
                  toast.error("Monto inválido");
                  return;
                }
                if (!fecha) {
                  toast.error("Indicá la fecha de la asignación");
                  return;
                }
                await onAsignar({
                  id_fondo: fondoActivo.id,
                  monto: n,
                  fecha_asignacion: fecha,
                  notas: notas || null,
                });
                setMonto("");
                setNotas("");
              }}
            >
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Nueva asignación
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="mt-0.5 w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="mt-0.5 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  required
                />
              </div>
              <div className="min-w-[12rem] flex-1">
                <label className="block text-[10px] font-bold uppercase text-slate-500">
                  Notas / concepto
                </label>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                <IconPlus size={14} />
                Registrar
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Fecha</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">Concepto</th>
                  <th className="px-2 py-1.5 text-right">Monto</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {movsCaja.map((r) => (
                  <tr key={r.key} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">
                      {r.kind === "asignacion" ? (
                        <input
                          type="date"
                          defaultValue={r.fecha || ""}
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== (r.raw.fecha_asignacion || null)) {
                              onPatchAsignacion(r.id, {
                                fecha_asignacion: v,
                              });
                            }
                          }}
                          className="rounded border border-slate-200 px-1 py-0.5"
                        />
                      ) : (
                        formatFechaCorta(r.fecha) || "—"
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          r.kind === "asignacion"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.kind === "reemplazo"
                              ? "bg-sky-100 text-sky-800"
                              : r.kind === "miscelaneo"
                                ? "bg-violet-100 text-violet-800"
                                : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.kind === "asignacion"
                          ? "Asignación"
                          : r.kind === "pago"
                            ? "Pago"
                            : r.kind === "contratacion"
                              ? "Contratación"
                              : r.kind === "miscelaneo"
                                ? "Misceláneo"
                                : "Reemplazo"}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      {r.kind === "asignacion" ? (
                        <input
                          defaultValue={r.raw.notas || ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== (r.raw.notas || null)) {
                              onPatchAsignacion(r.id, { notas: v });
                            }
                          }}
                          className="w-full min-w-[10rem] rounded border border-slate-200 px-1 py-0.5"
                          placeholder="Concepto"
                        />
                      ) : (
                        r.concepto
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.kind === "asignacion" ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={r.monto}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== Number(r.raw.monto)) {
                              onPatchAsignacion(r.id, { monto: v });
                            }
                          }}
                          className={`w-28 rounded border border-slate-200 px-1 py-0.5 text-right font-bold tabular-nums ${
                            r.signo < 0 ? "text-rose-700" : "text-emerald-700"
                          }`}
                        />
                      ) : (
                        <span
                          className={`font-bold tabular-nums ${
                            r.signo < 0 ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {r.signo < 0 ? "−" : "+"}
                          {money(r.monto)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.kind === "asignacion" && (
                        <button
                          type="button"
                          className="text-rose-500"
                          title="Eliminar asignación"
                          onClick={() => onDeleteAsignacion(r.id)}
                        >
                          <IconTrash size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!movsCaja.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-6 text-center text-slate-400"
                    >
                      Sin movimientos en este fondo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {fondoActivo.codigo === FONDO_CODIGOS.REEMPLAZOS && (
            <p className="text-[11px] text-slate-500">
              Los movimientos de reemplazo también se editan en la pestaña{" "}
              <strong>Cuentas / R</strong> (cuenta, estado, fecha efectuado).
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CuentasPanel({
  cuentas,
  movimientos,
  expedientes,
  onCreateCuenta,
  onCreateMov,
  onPatchMov,
  onDeleteMov,
}) {
  const [nombre, setNombre] = useState("");
  const [mov, setMov] = useState({
    id_cuenta: "",
    monto: "",
    estado: "pendiente",
    fecha_efectuado: "",
    concepto: "",
  });

  const cuentasConMisc = useMemo(() => {
    return (cuentas || []).map((c) => {
      const misc = (expedientes || []).reduce((s, ex) => {
        if (String(ex.id_cuenta_miscelaneo) !== String(c.id)) return s;
        return s + (Number(ex.monto_miscelaneo) || 0);
      }, 0);
      // saldo ya incluye misc + pagos en saldosCuentasReemplazo()
      return { ...c, saldo: Number(c.saldo) || 0, misc };
    });
  }, [cuentas, expedientes]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {cuentasConMisc.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border p-3 ${
              c.saldo < 0
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="text-sm font-bold text-slate-800">{c.nombre}</div>
            <div
              className={`mt-1 text-lg font-black tabular-nums ${
                c.saldo < 0 ? "text-rose-700" : "text-emerald-700"
              }`}
            >
              ${money(c.saldo)}
            </div>
            {c.misc > 0 && (
              <div className="text-[10px] text-slate-500">
                Incluye misceláneos ${money(c.misc)}
              </div>
            )}
            {c.saldo < 0 && (
              <div className="text-[10px] font-bold text-rose-600">
                A reponer: ${money(Math.abs(c.saldo))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          await onCreateCuenta(nombre.trim());
          setNombre("");
        }}
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva cuenta"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white"
        >
          Agregar cuenta
        </button>
      </form>

      <form
        className="grid gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const row = {
            id_cuenta: mov.id_cuenta ? Number(mov.id_cuenta) : null,
            monto: Number(mov.monto) || 0,
            estado: mov.estado,
            fecha_efectuado: mov.fecha_efectuado || null,
            concepto: mov.concepto || null,
          };
          if (row.estado === "efectuado" && (!row.id_cuenta || !row.fecha_efectuado)) {
            toast.error("Efectuado requiere cuenta y fecha");
            return;
          }
          await onCreateMov(row);
          setMov({
            id_cuenta: "",
            monto: "",
            estado: "pendiente",
            fecha_efectuado: "",
            concepto: "",
          });
        }}
      >
        <select
          value={mov.id_cuenta}
          onChange={(e) => setMov((s) => ({ ...s, id_cuenta: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        >
          <option value="">Cuenta (opc. si pendiente)</option>
          {(cuentas || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          value={mov.monto}
          onChange={(e) => setMov((s) => ({ ...s, monto: e.target.value }))}
          placeholder="Monto (puede 0)"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <select
          value={mov.estado}
          onChange={(e) => setMov((s) => ({ ...s, estado: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        >
          <option value="pendiente">Pendiente</option>
          <option value="efectuado">Efectuado</option>
        </select>
        <input
          type="date"
          value={mov.fecha_efectuado}
          onChange={(e) =>
            setMov((s) => ({ ...s, fecha_efectuado: e.target.value }))
          }
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          + Movimiento
        </button>
        <input
          value={mov.concepto}
          onChange={(e) => setMov((s) => ({ ...s, concepto: e.target.value }))}
          placeholder="Concepto"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm sm:col-span-2 lg:col-span-5"
        />
      </form>

      <table className="w-full min-w-[48rem] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-2 py-1.5">Fecha efectuado</th>
            <th className="px-2 py-1.5">Cuenta</th>
            <th className="px-2 py-1.5">Concepto</th>
            <th className="px-2 py-1.5 text-right">Monto</th>
            <th className="px-2 py-1.5">Estado</th>
            <th className="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {(movimientos || []).map((m) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="px-2 py-1.5">
                <input
                  type="date"
                  defaultValue={m.fecha_efectuado || ""}
                  onBlur={(e) => {
                    const v = e.target.value || null;
                    if (v !== (m.fecha_efectuado || null)) {
                      onPatchMov(m.id, { fecha_efectuado: v });
                    }
                  }}
                  className="rounded border border-slate-200 px-1 py-0.5"
                />
              </td>
              <td className="px-2 py-1.5">
                <select
                  value={m.id_cuenta || ""}
                  onChange={(e) =>
                    onPatchMov(m.id, {
                      id_cuenta: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="rounded border border-slate-200 px-1 py-0.5"
                >
                  <option value="">—</option>
                  {(cuentas || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <input
                  defaultValue={m.concepto || ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== (m.concepto || null)) {
                      onPatchMov(m.id, { concepto: v });
                    }
                  }}
                  className="w-full min-w-[8rem] rounded border border-slate-200 px-1 py-0.5"
                />
              </td>
              <td className="px-2 py-1.5 text-right">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={m.monto}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== Number(m.monto)) {
                      onPatchMov(m.id, { monto: v });
                    }
                  }}
                  className="w-24 rounded border border-slate-200 px-1 py-0.5 text-right font-bold tabular-nums"
                />
              </td>
              <td className="px-2 py-1.5">
                <select
                  value={m.estado}
                  onChange={(e) => {
                    const estado = e.target.value;
                    const patch = { estado };
                    if (
                      estado === "efectuado" &&
                      !m.fecha_efectuado &&
                      m.id_cuenta
                    ) {
                      patch.fecha_efectuado = new Date()
                        .toISOString()
                        .slice(0, 10);
                    }
                    onPatchMov(m.id, patch);
                  }}
                  className={`rounded border px-1 py-0.5 text-[10px] font-bold ${
                    m.estado === "efectuado"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <option value="pendiente">pendiente</option>
                  <option value="efectuado">efectuado</option>
                </select>
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  className="text-rose-500"
                  title="Eliminar movimiento"
                  onClick={() => onDeleteMov?.(m.id)}
                >
                  <IconTrash size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function patchField(ex, key, raw, onPatch, { number = false, emptyNull = true } = {}) {
  let next = raw;
  if (number) {
    next = raw === "" || raw == null ? null : Number(raw);
  } else if (emptyNull && typeof raw === "string") {
    next = raw.trim() || null;
  }
  const prev = ex[key] ?? null;
  if (String(next ?? "") === String(prev ?? "")) return;
  onPatch(ex.id, { [key]: next });
}

const TILDE_DEFS = [
  ["firma_nota", "Firma"],
  ["documentacion", "Doc"],
  ["facturacion", "Fact"],
  ["enviado_adm", "ADM"],
];

function TilBadges({ ex, interactive = false, onPatch }) {
  const [editingKey, setEditingKey] = useState(null);

  return (
    <div className="flex flex-wrap gap-1.5">
      {TILDE_DEFS.map(([key, label]) => {
        const dateVal = tildeDateValue(ex?.[key]);
        const on = Boolean(dateVal);
        if (!interactive) {
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                on
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-400"
              }`}
              title={on ? `${label}: ${formatFechaCorta(dateVal)}` : label}
            >
              {label}
              {on ? (
                <span className="tabular-nums font-semibold">
                  {formatFechaCorta(dateVal)}
                </span>
              ) : null}
            </span>
          );
        }

        return (
          <div
            key={key}
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-bold ${
              on
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  if (e.target.checked) {
                    onPatch?.(ex.id, { [key]: todayISODate() });
                  } else {
                    onPatch?.(ex.id, { [key]: null });
                    setEditingKey(null);
                  }
                }}
              />
              {label}
            </label>
            {on && (
              <>
                {editingKey === key ? (
                  <input
                    type="date"
                    autoFocus
                    defaultValue={dateVal}
                    className="rounded border border-emerald-300 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-700"
                    onBlur={(e) => {
                      const next = e.target.value || null;
                      if (next !== dateVal) onPatch?.(ex.id, { [key]: next });
                      setEditingKey(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                  />
                ) : (
                  <>
                    <span className="tabular-nums">
                      {formatFechaCorta(dateVal)}
                    </span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100"
                      title="Editar fecha"
                      onClick={() => setEditingKey(key)}
                    >
                      <IconPencil size={11} />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function aereoModoLabel(modo) {
  return AEREO_MODOS.find((m) => m.value === modo)?.label || "—";
}

function HubDetailModal({ open, title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-detail-modal-title"
        className={`flex max-h-[min(94vh,56rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl ${
          wide ? "sm:max-w-6xl" : "sm:max-w-3xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3
              id="hub-detail-modal-title"
              className="truncate text-base font-bold text-slate-900"
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ExpedientesPanel({
  expedientes,
  productores,
  fondos,
  cuentas,
  giras,
  contrataciones,
  pagos,
  filterEstado,
  setFilterEstado,
  filterTil,
  setFilterTil,
  onCreate,
  onPatch,
  onLinkContratacion,
  onLinkPago,
  onCreatePago,
  onPatchPago,
  onDeletePago,
  onCreateProductor,
}) {
  const [draft, setDraft] = useState({
    nombre: "",
    titular_nombre: "",
    id_productor: "",
    id_fondo: "",
    id_gira: "",
  });
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [linkArtista, setLinkArtista] = useState("");
  const [linkPago, setLinkPago] = useState("");
  const [showCalc, setShowCalc] = useState(true);
  const [pagoDraft, setPagoDraft] = useState({
    clase: "pago",
    concepto: "",
    monto: "",
    id_fondo: "",
    id_cuenta_reemplazo: "",
  });
  const [unlinkConfirm, setUnlinkConfirm] = useState(null);
  const [productorModalFor, setProductorModalFor] = useState(null); // "selected" | "draft" | null
  const [productorDraft, setProductorDraft] = useState({
    nombre: "",
    cuit: "",
    mail: "",
    telefono: "",
  });
  const [savingProductor, setSavingProductor] = useState(false);

  const selected = useMemo(
    () => (expedientes || []).find((ex) => String(ex.id) === String(selectedId)),
    [expedientes, selectedId],
  );

  const sinExpedienteContr = useMemo(
    () => (contrataciones || []).filter((c) => !c.id_expediente),
    [contrataciones],
  );
  const sinExpedientePagos = useMemo(
    () => (pagos || []).filter((p) => !p.id_expediente),
    [pagos],
  );

  const artistaOptions = useMemo(
    () =>
      sinExpedienteContr.map((c) => {
        const artista = artistaLabel(c);
        const gira = contratacionGiraLabel(c) || "Sin gira";
        const prog = c?.giras_integrantes?.programas;
        return {
          value: String(c.id),
          label: `${artista} · ${gira}`,
          searchText: [
            artista,
            gira,
            prog?.nomenclador,
            prog?.mes_letra,
            prog?.nombre_gira,
            c.cachet_ars,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [sinExpedienteContr],
  );

  const hijos = useMemo(
    () =>
      selected
        ? (contrataciones || []).filter(
            (c) => String(c.id_expediente) === String(selected.id),
          )
        : [],
    [contrataciones, selected],
  );
  const hijosPagos = useMemo(
    () =>
      selected
        ? (pagos || []).filter(
            (p) => String(p.id_expediente) === String(selected.id),
          )
        : [],
    [pagos, selected],
  );

  const netoHijos = hijos.reduce(
    (s, c) => s + (Number(c.cachet_ars) || 0),
    0,
  );
  const breakdown = selected
    ? buildBrutoBreakdown(netoHijos, selected.monto_miscelaneo)
    : null;
  const comisionEffective =
    selected?.monto_comision != null && selected.monto_comision !== ""
      ? Number(selected.monto_comision)
      : breakdown?.comisionSugerida;
  const brutoFactura =
    selected?.monto_bruto_facturar != null &&
    selected.monto_bruto_facturar !== ""
      ? Number(selected.monto_bruto_facturar)
      : breakdown?.brutoSugerido;
  const comisionAlert =
    selected &&
    isComisionBelowThreshold(comisionEffective, brutoFactura);

  const fondoReemplazos = useMemo(
    () =>
      (fondos || []).find((f) => f.codigo === FONDO_CODIGOS.REEMPLAZOS) || null,
    [fondos],
  );
  const miscEsReemplazos =
    selected &&
    fondoReemplazos &&
    String(selected.id_fondo_miscelaneo) === String(fondoReemplazos.id);

  const closeModal = () => {
    setSelectedId(null);
    setLinkArtista("");
    setLinkPago("");
    setPagoDraft({
      clase: "pago",
      concepto: "",
      monto: "",
      id_fondo: "",
      id_cuenta_reemplazo: "",
    });
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const childrenOf = (exId) => {
    const arts = (contrataciones || []).filter(
      (c) => String(c.id_expediente) === String(exId),
    );
    const pgs = (pagos || []).filter(
      (p) => String(p.id_expediente) === String(exId),
    );
    return { arts, pgs };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          placeholder="Filtrar último estado…"
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
        <select
          value={filterTil}
          onChange={(e) => setFilterTil(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">Todas las tildes</option>
          <option value="sin_firma">Sin firma nota</option>
          <option value="firma">Con firma nota</option>
          <option value="doc">Con documentación</option>
          <option value="fact">Con facturación</option>
          <option value="adm">Enviado a ADM</option>
        </select>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <IconPlus size={14} />
          Nuevo expediente
        </button>
      </div>

      {creating && (
        <form
          className="flex flex-wrap gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await onCreate({
              nombre: draft.nombre.trim() || null,
              titular_nombre: draft.titular_nombre || null,
              id_productor: draft.id_productor
                ? Number(draft.id_productor)
                : null,
              id_fondo: draft.id_fondo ? Number(draft.id_fondo) : null,
              id_gira: draft.id_gira ? Number(draft.id_gira) : null,
              tipo: null,
            });
            setDraft({
              nombre: "",
              titular_nombre: "",
              id_productor: "",
              id_fondo: "",
              id_gira: "",
            });
            setCreating(false);
          }}
        >
          <input
            value={draft.nombre}
            onChange={(e) => setDraft((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Nombre del expediente *"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            required
            autoFocus
          />
          <div className="min-w-[14rem] flex-1">
            <GiraSelect
              value={draft.id_gira}
              onChange={(e) =>
                setDraft((s) => ({ ...s, id_gira: e.target.value }))
              }
              giras={giras}
              emptyLabel="Gira del expediente…"
            />
          </div>
          <input
            value={draft.titular_nombre}
            onChange={(e) =>
              setDraft((s) => ({ ...s, titular_nombre: e.target.value }))
            }
            placeholder="Titular"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          />
          <div className="flex min-w-[12rem] flex-1 items-center gap-1">
            <select
              value={draft.id_productor}
              onChange={(e) =>
                setDraft((s) => ({ ...s, id_productor: e.target.value }))
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">Sin productor</option>
              {(productores || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
              title="Crear productor"
              onClick={() => {
                setProductorDraft({
                  nombre: "",
                  cuit: "",
                  mail: "",
                  telefono: "",
                });
                setProductorModalFor("draft");
              }}
            >
              <IconPlus size={12} />
            </button>
          </div>
          <select
            value={draft.id_fondo}
            onChange={(e) =>
              setDraft((s) => ({ ...s, id_fondo: e.target.value }))
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Fondo…</option>
            {(fondos || []).map((f) => (
              <option key={f.id} value={f.id}>
                {fondoOptionLabel(f)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            Crear
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
          >
            Cancelar
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Gira</th>
                <th className="px-3 py-2">Titular / productor</th>
                {TILDE_DEFS.map(([key, label]) => (
                  <th
                    key={key}
                    className="px-1.5 py-2 text-center"
                    title={label}
                  >
                    {label}
                  </th>
                ))}
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-center">Art.</th>
                <th className="px-3 py-2 text-center">Pagos</th>
                <th className="px-3 py-2 text-center">Gastos</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(expedientes || []).map((ex) => {
                const { arts, pgs } = childrenOf(ex.id);
                const neto = arts.reduce(
                  (s, c) => s + (Number(c.cachet_ars) || 0),
                  0,
                );
                const sug = suggestBrutoFromNeto(neto, ex.monto_miscelaneo);
                const bruto =
                  ex.monto_bruto_facturar != null
                    ? Number(ex.monto_bruto_facturar)
                    : sug;
                const open = expandedIds.has(ex.id);
                return (
                  <React.Fragment key={ex.id}>
                    <tr className="border-t border-slate-100 hover:bg-indigo-50/30">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                          onClick={() => toggleExpand(ex.id)}
                          title={open ? "Ocultar incluidos" : "Ver incluidos"}
                        >
                          {open ? "▾" : "▸"}
                        </button>
                      </td>
                      <td
                        className="cursor-pointer px-3 py-2 font-bold text-slate-800"
                        onClick={() => setSelectedId(ex.id)}
                      >
                        {ex.nombre || (
                          <span className="font-medium text-slate-400">
                            Sin nombre
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {ex.numero_expediente || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {giraLabel(ex.programas) || (
                          <span className="text-amber-700">Sin gira</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {ex.titular_nombre ||
                          ex.gestion_productores?.nombre ||
                          "—"}
                      </td>
                      {TILDE_DEFS.map(([key, label]) => {
                        const on = Boolean(tildeDateValue(ex?.[key]));
                        return (
                          <td
                            key={key}
                            className="px-1.5 py-2 text-center"
                            title={
                              on
                                ? `${label}: ${formatFechaCorta(tildeDateValue(ex[key]))}`
                                : `${label}: pendiente`
                            }
                          >
                            {on ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-sm font-black text-emerald-700">
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300">·</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="max-w-[9rem] truncate px-3 py-2 text-slate-600">
                        {ex.ultimo_estado_conocido || "—"}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold text-violet-700">
                        {arts.length}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold text-emerald-700">
                        {
                          pgs.filter((p) => (p.clase || "pago") === "pago")
                            .length
                        }
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums font-bold text-amber-700">
                        {
                          pgs.filter((p) => p.clase === "gasto").length
                        }
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800">
                        ${money(bruto)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                          onClick={() => setSelectedId(ex.id)}
                        >
                          <IconEdit size={12} />
                          Abrir
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-slate-50 bg-slate-50/80">
                        <td colSpan={15} className="px-4 py-2">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase text-violet-700">
                                Artistas ({arts.length})
                              </div>
                              {arts.length ? (
                                <ul className="space-y-0.5">
                                  {arts.map((c) => (
                                    <li
                                      key={c.id}
                                      className="flex justify-between gap-2 text-[11px]"
                                    >
                                      <span className="font-semibold text-slate-800">
                                        {artistaLabel(c)}
                                      </span>
                                      <span className="tabular-nums text-slate-600">
                                        ${money(c.cachet_ars)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  Sin artistas
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase text-emerald-700">
                                Pagos (
                                {
                                  pgs.filter(
                                    (p) => (p.clase || "pago") === "pago",
                                  ).length
                                }
                                )
                              </div>
                              {pgs.filter((p) => (p.clase || "pago") === "pago")
                                .length ? (
                                <ul className="space-y-0.5">
                                  {pgs
                                    .filter(
                                      (p) => (p.clase || "pago") === "pago",
                                    )
                                    .map((p) => (
                                      <li
                                        key={p.id}
                                        className="flex justify-between gap-2 text-[11px]"
                                      >
                                        <span className="text-slate-800">
                                          {p.concepto}
                                        </span>
                                        <span className="tabular-nums font-bold text-slate-700">
                                          ${money(p.monto)}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  Sin pagos
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 text-[10px] font-bold uppercase text-amber-700">
                                Gastos (
                                {pgs.filter((p) => p.clase === "gasto").length})
                              </div>
                              {pgs.filter((p) => p.clase === "gasto").length ? (
                                <ul className="space-y-0.5">
                                  {pgs
                                    .filter((p) => p.clase === "gasto")
                                    .map((p) => (
                                      <li
                                        key={p.id}
                                        className="flex justify-between gap-2 text-[11px]"
                                      >
                                        <span className="text-slate-800">
                                          {p.concepto}
                                        </span>
                                        <span className="tabular-nums font-bold text-slate-700">
                                          ${money(p.monto)}
                                        </span>
                                      </li>
                                    ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  Sin gastos
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!expedientes?.length && (
                <tr>
                  <td
                    colSpan={15}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    Todavía no hay expedientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HubDetailModal
        open={Boolean(selected)}
        onClose={closeModal}
        wide
        title={selected?.nombre || `Expediente #${selected?.id || ""}`}
        subtitle={
          selected
            ? [
                selected.numero_expediente
                  ? `Nº ${selected.numero_expediente}`
                  : null,
                giraLabel(selected.programas),
              ]
                .filter(Boolean)
                .join(" · ")
            : null
        }
      >
        {selected && breakdown && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/20 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Nombre
                </label>
                <input
                  key={`nombre-${selected.id}-${selected.updated_at || ""}`}
                  defaultValue={selected.nombre || ""}
                  onBlur={(e) =>
                    patchField(selected, "nombre", e.target.value, onPatch)
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-bold shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Nº oficial
                </label>
                <input
                  key={`num-${selected.id}-${selected.numero_expediente || ""}`}
                  defaultValue={selected.numero_expediente || ""}
                  onBlur={(e) =>
                    patchField(
                      selected,
                      "numero_expediente",
                      e.target.value,
                      onPatch,
                    )
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 xl:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Gira asociada
                </label>
                <div className="mt-0.5">
                  <GiraSelect
                    value={selected.id_gira || ""}
                    onChange={(e) =>
                      onPatch(selected.id, {
                        id_gira: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    giras={giras}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Titular
                </label>
                <input
                  key={`tit-${selected.id}-${selected.titular_nombre || ""}`}
                  defaultValue={selected.titular_nombre || ""}
                  onBlur={(e) =>
                    patchField(
                      selected,
                      "titular_nombre",
                      e.target.value,
                      onPatch,
                    )
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Productor
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-700 hover:underline"
                    onClick={() => {
                      setProductorDraft({
                        nombre: "",
                        cuit: "",
                        mail: "",
                        telefono: "",
                      });
                      setProductorModalFor("selected");
                    }}
                  >
                    <IconPlus size={11} />
                    Nuevo
                  </button>
                </div>
                <select
                  value={selected.id_productor || ""}
                  onChange={(e) =>
                    onPatch(selected.id, {
                      id_productor: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                >
                  <option value="">Sin productor</option>
                  {(productores || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Fondo expediente
                </label>
                <select
                  value={selected.id_fondo || ""}
                  onChange={(e) =>
                    onPatch(selected.id, {
                      id_fondo: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                >
                  <option value="">Sin fondo</option>
                  {(fondos || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {fondoOptionLabel(f)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Último estado
                </label>
                <input
                  key={`est-${selected.id}-${selected.ultimo_estado_conocido || ""}`}
                  defaultValue={selected.ultimo_estado_conocido || ""}
                  onBlur={(e) =>
                    patchField(
                      selected,
                      "ultimo_estado_conocido",
                      e.target.value,
                      onPatch,
                    )
                  }
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Observaciones
                </label>
                <textarea
                  key={`obs-${selected.id}-${selected.observaciones || ""}`}
                  defaultValue={selected.observaciones || ""}
                  onBlur={(e) =>
                    patchField(
                      selected,
                      "observaciones",
                      e.target.value,
                      onPatch,
                    )
                  }
                  rows={2}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 rounded-xl border border-slate-200/70 bg-white p-2.5">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Tildes y fechas del ciclo
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TilBadges ex={selected} interactive onPatch={onPatch} />
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="min-w-0">
                    <label className="text-[9px] font-bold uppercase text-slate-500">
                      Presentación
                    </label>
                    <input
                      type="date"
                      key={`fp-${selected.id}-${selected.fecha_presentacion || ""}`}
                      defaultValue={selected.fecha_presentacion || ""}
                      onBlur={(e) =>
                        patchField(
                          selected,
                          "fecha_presentacion",
                          e.target.value,
                          onPatch,
                        )
                      }
                      className="mt-0.5 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[9px] font-bold uppercase text-slate-500">
                      Pago solicitado
                    </label>
                    <input
                      type="date"
                      key={`fps-${selected.id}-${selected.fecha_pago_solicitado || ""}`}
                      defaultValue={selected.fecha_pago_solicitado || ""}
                      onBlur={(e) =>
                        patchField(
                          selected,
                          "fecha_pago_solicitado",
                          e.target.value,
                          onPatch,
                        )
                      }
                      className="mt-0.5 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[9px] font-bold uppercase text-slate-500">
                      Pago efectuado
                    </label>
                    <input
                      type="date"
                      key={`fpe-${selected.id}-${selected.fecha_pago_efectuado || ""}`}
                      defaultValue={selected.fecha_pago_efectuado || ""}
                      onBlur={(e) =>
                        patchField(
                          selected,
                          "fecha_pago_efectuado",
                          e.target.value,
                          onPatch,
                        )
                      }
                      className="mt-0.5 block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50/20 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Montos / factura
                </div>
                <button
                  type="button"
                  className="text-[10px] font-bold text-indigo-700 underline"
                  onClick={() => setShowCalc((v) => !v)}
                >
                  {showCalc ? "Ocultar calculadora" : "Ver calculadora"}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MoneyField
                  label="Misceláneo"
                  value={selected.monto_miscelaneo}
                  onCommit={(n) =>
                    onPatch(selected.id, { monto_miscelaneo: n ?? 0 })
                  }
                />
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Destino misceláneo
                  </label>
                  <select
                    value={selected.id_fondo_miscelaneo || ""}
                    onChange={(e) => {
                      const idFondo = e.target.value
                        ? Number(e.target.value)
                        : null;
                      const patch = {
                        id_fondo_miscelaneo: idFondo,
                      };
                      if (
                        !idFondo ||
                        !fondoReemplazos ||
                        String(idFondo) !== String(fondoReemplazos.id)
                      ) {
                        patch.id_cuenta_miscelaneo = null;
                      }
                      onPatch(selected.id, patch);
                    }}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                  >
                    <option value="">Sin asignar</option>
                    {(fondos || []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {fondoOptionLabel(f)}
                      </option>
                    ))}
                  </select>
                  {miscEsReemplazos && (
                    <CuentaReemplazoSelect
                      value={selected.id_cuenta_miscelaneo}
                      onChange={(id) =>
                        onPatch(selected.id, { id_cuenta_miscelaneo: id })
                      }
                      cuentas={cuentas}
                      emptyLabel="Cuenta (opcional)…"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                    />
                  )}
                </div>
                <MoneyField
                  label="Comisión (10%)"
                  value={
                    selected.monto_comision != null
                      ? selected.monto_comision
                      : breakdown.comisionSugerida
                  }
                  onCommit={(n) =>
                    onPatch(selected.id, { monto_comision: n })
                  }
                  hint={`Sugerida $${money(breakdown.comisionSugerida)}`}
                />
                <MoneyField
                  label="Bruto a facturar"
                  value={
                    selected.monto_bruto_facturar != null
                      ? selected.monto_bruto_facturar
                      : breakdown.brutoSugerido
                  }
                  onCommit={(n) =>
                    onPatch(selected.id, { monto_bruto_facturar: n })
                  }
                  hint={`Sugerido $${money(breakdown.brutoSugerido)}`}
                />
              </div>
              {comisionAlert && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-900">
                  <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
                  La comisión es menor al 10% del bruto de la factura ($
                  {money(brutoFactura)}).
                </div>
              )}
              {showCalc && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white text-[11px]">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[10px] font-bold uppercase text-slate-600">
                    Calculadora — origen del bruto sugerido
                  </div>
                  <ul className="divide-y divide-slate-100 px-3">
                    <li className="flex justify-between py-1.5">
                      <span>Neto contrataciones (ARS)</span>
                      <span className="font-bold tabular-nums">
                        ${money(breakdown.neto)}
                      </span>
                    </li>
                    <li className="flex justify-between py-1.5 text-slate-500">
                      <span>Bruto base (= neto / 0,85)</span>
                      <span className="tabular-nums">
                        ${money(breakdown.brutoBase)}
                      </span>
                    </li>
                    <li className="flex justify-between py-1.5 text-slate-500">
                      <span>Comisión 10% sugerida</span>
                      <span className="tabular-nums">
                        ${money(breakdown.comisionSugerida)}
                      </span>
                    </li>
                    <li className="flex justify-between py-1.5 text-slate-500">
                      <span>Otros ~5% del bruto base</span>
                      <span className="tabular-nums">
                        ${money(breakdown.otrosPorcentaje)}
                      </span>
                    </li>
                    <li className="flex justify-between py-1.5 text-slate-500">
                      <span>+ Misceláneo</span>
                      <span className="tabular-nums">
                        ${money(breakdown.miscelaneo)}
                      </span>
                    </li>
                    <li className="flex justify-between py-1.5 font-bold text-indigo-900">
                      <span>Bruto sugerido factura</span>
                      <span className="tabular-nums">
                        ${money(breakdown.brutoSugerido)}
                      </span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white"
                      onClick={() =>
                        onPatch(selected.id, {
                          monto_bruto_facturar: breakdown.brutoSugerido,
                          monto_comision: breakdown.comisionSugerida,
                        })
                      }
                    >
                      Aplicar sugeridos
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700"
                      onClick={() =>
                        onPatch(selected.id, {
                          monto_comision: suggestComisionFromNeto(netoHijos),
                        })
                      }
                    >
                      Solo comisión sugerida
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 rounded-xl border border-slate-200/70 bg-slate-50/15 p-3 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                  Artistas / contrataciones ({hijos.length})
                </div>
                <ul className="space-y-1">
                  {hijos.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800">
                          {artistaLabel(c)}
                        </span>
                        <span className="block truncate text-[10px] text-violet-700">
                          {contratacionGiraLabel(c) || "Sin gira"}
                        </span>
                      </span>
                      <span className="tabular-nums text-slate-600">
                        ${money(c.cachet_ars)}
                      </span>
                      <button
                        type="button"
                        className="text-[10px] font-bold text-rose-600"
                        onClick={() =>
                          setUnlinkConfirm({
                            kind: "artista",
                            id: c.id,
                            label: `${artistaLabel(c)} · ${contratacionGiraLabel(c) || "sin gira"}`,
                          })
                        }
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                  {!hijos.length && (
                    <li className="text-[11px] text-slate-400">
                      Sin artistas vinculados
                    </li>
                  )}
                </ul>
                {artistaOptions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <SearchableOptionPicker
                      className="min-w-[12rem] flex-1"
                      options={artistaOptions}
                      value={linkArtista}
                      onChange={setLinkArtista}
                      placeholder="Buscar artista o gira…"
                      emptyLabel="+ Vincular artista (artista · gira)…"
                    />
                    <button
                      type="button"
                      className="rounded bg-violet-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                      disabled={!linkArtista}
                      onClick={async () => {
                        await onLinkContratacion(
                          Number(linkArtista),
                          selected.id,
                        );
                        setLinkArtista("");
                      }}
                    >
                      Vincular
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Pagos y gastos ({hijosPagos.length})
                </div>
                <p className="mb-2 text-[10px] leading-snug text-slate-500">
                  <span className="font-bold text-emerald-700">Pago</span> =
                  liquidación/desembolso ·{" "}
                  <span className="font-bold text-amber-700">Gasto</span> =
                  costo operativo (aéreo, extras). Pueden convivir en el mismo
                  expediente.
                </p>
                <ul className="space-y-1">
                  {hijosPagos.map((p) => {
                    const esGasto = p.clase === "gasto";
                    return (
                      <li
                        key={p.id}
                        className={`rounded-lg border p-2 text-xs ${
                          esGasto
                            ? "border-amber-100 bg-amber-50/70"
                            : "border-emerald-100 bg-emerald-50/70"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            value={p.clase || "pago"}
                            onChange={(e) =>
                              onPatchPago?.(p.id, { clase: e.target.value })
                            }
                            className={`rounded border bg-white px-1 py-1 text-[10px] font-bold ${
                              esGasto
                                ? "border-amber-300 text-amber-800"
                                : "border-emerald-300 text-emerald-800"
                            }`}
                          >
                            {PAGO_CLASES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            key={`pc-${p.id}-${p.concepto}`}
                            defaultValue={p.concepto || ""}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== p.concepto) {
                                onPatchPago?.(p.id, { concepto: v });
                              }
                            }}
                            className="min-w-[8rem] flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 font-medium"
                          />
                          <input
                            type="number"
                            step="0.01"
                            key={`pm-${p.id}-${p.monto}`}
                            defaultValue={p.monto ?? ""}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v) && v !== Number(p.monto)) {
                                onPatchPago?.(p.id, { monto: v });
                              }
                            }}
                            className="w-24 rounded border border-slate-200 bg-white px-1.5 py-1 text-right font-bold tabular-nums"
                          />
                          <select
                            value={p.id_fondo || ""}
                            onChange={(e) => {
                              const idFondo = e.target.value
                                ? Number(e.target.value)
                                : null;
                              const patch = { id_fondo: idFondo };
                              if (!isFondoReemplazos(fondos, idFondo)) {
                                patch.id_cuenta_reemplazo = null;
                              }
                              onPatchPago?.(p.id, patch);
                            }}
                            className="rounded border border-slate-200 bg-white px-1 py-1"
                          >
                            <option value="">Fondo…</option>
                            {(fondos || []).map((f) => (
                              <option key={f.id} value={f.id}>
                                {fondoOptionLabel(f)}
                              </option>
                            ))}
                          </select>
                          {isFondoReemplazos(fondos, p.id_fondo) && (
                            <CuentaReemplazoSelect
                              value={p.id_cuenta_reemplazo}
                              onChange={(id) =>
                                onPatchPago?.(p.id, {
                                  id_cuenta_reemplazo: id,
                                })
                              }
                              cuentas={cuentas}
                              required
                              emptyLabel="Cuenta (saldo)…"
                            />
                          )}
                          <button
                            type="button"
                            className="text-[10px] font-bold text-rose-600"
                            onClick={() =>
                              setUnlinkConfirm({
                                kind: "pago",
                                id: p.id,
                                label: `${pagoClaseLabel(p.clase)} · ${p.concepto} ($${money(p.monto)})`,
                              })
                            }
                          >
                            Quitar
                          </button>
                          <button
                            type="button"
                            className="text-rose-500"
                            title="Eliminar"
                            onClick={() => onDeletePago?.(p.id)}
                          >
                            <IconTrash size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {!hijosPagos.length && (
                    <li className="text-[11px] text-slate-400">
                      Sin pagos ni gastos vinculados
                    </li>
                  )}
                </ul>

                <form
                  className="mt-2 space-y-1 rounded-lg border border-dashed border-slate-300 bg-white p-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!pagoDraft.concepto.trim()) return;
                    const idFondo = pagoDraft.id_fondo
                      ? Number(pagoDraft.id_fondo)
                      : null;
                    const usaReemplazos = isFondoReemplazos(fondos, idFondo);
                    if (usaReemplazos && !pagoDraft.id_cuenta_reemplazo) {
                      toast.error(
                        "Elegí la cuenta de reemplazos (se muestra el saldo actual).",
                      );
                      return;
                    }
                    await onCreatePago?.({
                      clase: pagoDraft.clase || "pago",
                      concepto: pagoDraft.concepto.trim(),
                      monto: Number(pagoDraft.monto) || 0,
                      id_fondo: idFondo,
                      id_cuenta_reemplazo: usaReemplazos
                        ? Number(pagoDraft.id_cuenta_reemplazo)
                        : null,
                      id_expediente: selected.id,
                    });
                    setPagoDraft({
                      clase: pagoDraft.clase || "pago",
                      concepto: "",
                      monto: "",
                      id_fondo: "",
                      id_cuenta_reemplazo: "",
                    });
                  }}
                >
                  <div className="text-[10px] font-bold uppercase text-slate-600">
                    Nuevo en este expediente
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <select
                      value={pagoDraft.clase || "pago"}
                      onChange={(e) =>
                        setPagoDraft((s) => ({ ...s, clase: e.target.value }))
                      }
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs font-bold"
                    >
                      {PAGO_CLASES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={pagoDraft.concepto}
                      onChange={(e) =>
                        setPagoDraft((s) => ({
                          ...s,
                          concepto: e.target.value,
                        }))
                      }
                      placeholder="Concepto"
                      className="min-w-[8rem] flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={pagoDraft.monto}
                      onChange={(e) =>
                        setPagoDraft((s) => ({ ...s, monto: e.target.value }))
                      }
                      placeholder="Monto"
                      className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right text-xs"
                    />
                    <select
                      value={pagoDraft.id_fondo}
                      onChange={(e) =>
                        setPagoDraft((s) => ({
                          ...s,
                          id_fondo: e.target.value,
                          id_cuenta_reemplazo: isFondoReemplazos(
                            fondos,
                            e.target.value,
                          )
                            ? s.id_cuenta_reemplazo
                            : "",
                        }))
                      }
                      className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                    >
                      <option value="">Fondo…</option>
                      {(fondos || []).map((f) => (
                        <option key={f.id} value={f.id}>
                          {fondoOptionLabel(f)}
                        </option>
                      ))}
                    </select>
                    {isFondoReemplazos(fondos, pagoDraft.id_fondo) && (
                      <CuentaReemplazoSelect
                        value={pagoDraft.id_cuenta_reemplazo}
                        onChange={(id) =>
                          setPagoDraft((s) => ({
                            ...s,
                            id_cuenta_reemplazo: id || "",
                          }))
                        }
                        cuentas={cuentas}
                        required
                        emptyLabel="Cuenta (saldo)…"
                      />
                    )}
                    <button
                      type="submit"
                      className="rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white"
                    >
                      + Agregar
                    </button>
                  </div>
                </form>

                {sinExpedientePagos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <select
                      value={linkPago}
                      onChange={(e) => setLinkPago(e.target.value)}
                      className="min-w-[10rem] flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs"
                    >
                      <option value="">+ Vincular pago existente…</option>
                      {sinExpedientePagos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.concepto} (${money(p.monto)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                      disabled={!linkPago}
                      onClick={async () => {
                        await onLinkPago(Number(linkPago), selected.id);
                        setLinkPago("");
                      }}
                    >
                      Vincular
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </HubDetailModal>

      {productorModalFor &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
            onClick={() => !savingProductor && setProductorModalFor(null)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="nuevo-productor-title"
              className="w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <h3
                  id="nuevo-productor-title"
                  className="text-base font-bold text-slate-900"
                >
                  Nuevo productor
                </h3>
                <button
                  type="button"
                  disabled={savingProductor}
                  onClick={() => setProductorModalFor(null)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                  aria-label="Cerrar"
                >
                  <IconX size={16} />
                </button>
              </div>
              <form
                className="space-y-3 bg-white px-4 py-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!productorDraft.nombre.trim() || savingProductor) return;
                  setSavingProductor(true);
                  try {
                    const created = await onCreateProductor?.({
                      nombre: productorDraft.nombre.trim(),
                      cuit: productorDraft.cuit.trim() || null,
                      mail: productorDraft.mail.trim() || null,
                      telefono: productorDraft.telefono.trim() || null,
                    });
                    if (created?.id) {
                      if (productorModalFor === "selected" && selected) {
                        await onPatch(selected.id, {
                          id_productor: created.id,
                        });
                      } else if (productorModalFor === "draft") {
                        setDraft((s) => ({
                          ...s,
                          id_productor: String(created.id),
                        }));
                      }
                    }
                    setProductorModalFor(null);
                  } catch (err) {
                    toast.error(err?.message || "No se pudo crear el productor");
                  } finally {
                    setSavingProductor(false);
                  }
                }}
              >
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Nombre *
                  </label>
                  <input
                    autoFocus
                    required
                    value={productorDraft.nombre}
                    onChange={(e) =>
                      setProductorDraft((s) => ({
                        ...s,
                        nombre: e.target.value,
                      }))
                    }
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                    placeholder="Razón social / nombre"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      CUIT
                    </label>
                    <input
                      value={productorDraft.cuit}
                      onChange={(e) =>
                        setProductorDraft((s) => ({
                          ...s,
                          cuit: e.target.value,
                        }))
                      }
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">
                      Teléfono
                    </label>
                    <input
                      value={productorDraft.telefono}
                      onChange={(e) =>
                        setProductorDraft((s) => ({
                          ...s,
                          telefono: e.target.value,
                        }))
                      }
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Mail
                  </label>
                  <input
                    type="email"
                    value={productorDraft.mail}
                    onChange={(e) =>
                      setProductorDraft((s) => ({
                        ...s,
                        mail: e.target.value,
                      }))
                    }
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={savingProductor}
                    onClick={() => setProductorModalFor(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingProductor || !productorDraft.nombre.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {savingProductor ? (
                      <IconLoader size={12} className="animate-spin" />
                    ) : (
                      <IconPlus size={12} />
                    )}
                    Crear y asignar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmModal
        isOpen={Boolean(unlinkConfirm)}
        onClose={() => setUnlinkConfirm(null)}
        title={
          unlinkConfirm?.kind === "pago"
            ? "Quitar del expediente"
            : "Quitar artista del expediente"
        }
        message={
          unlinkConfirm
            ? `¿Confirmás quitar «${unlinkConfirm.label}» de este expediente? No se borra el registro; solo se desvincula.`
            : ""
        }
        confirmText="Quitar"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        onConfirm={async () => {
          if (!unlinkConfirm) return;
          if (unlinkConfirm.kind === "pago") {
            await onLinkPago(unlinkConfirm.id, null);
          } else {
            await onLinkContratacion(unlinkConfirm.id, null);
          }
          setUnlinkConfirm(null);
        }}
      />
    </div>
  );
}

function emptyVuelo() {
  return {
    id: crypto.randomUUID(),
    numero: "",
    fecha: "",
    origen: "",
    destino: "",
    costo: "",
    notas: "",
  };
}

function normalizeAereoDetalle(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  return {
    vuelos: Array.isArray(d.vuelos) ? d.vuelos : [],
    costo_total: d.costo_total ?? "",
    id_fondo: d.id_fondo ?? "",
    notas: d.notas || "",
    id_pago_gasto: d.id_pago_gasto ?? null,
    id_expediente_transporte: d.id_expediente_transporte ?? null,
  };
}

function AereoOrquestaEditor({
  detalle,
  fondos,
  expedientes,
  onSave,
  onRegistrarAereoComoGasto,
  contratacion,
}) {
  const initial = normalizeAereoDetalle(detalle);
  const [vuelos, setVuelos] = useState(
    initial.vuelos.length ? initial.vuelos : [emptyVuelo()],
  );
  const [costoTotal, setCostoTotal] = useState(
    initial.costo_total === "" || initial.costo_total == null
      ? ""
      : String(initial.costo_total),
  );
  const [idFondo, setIdFondo] = useState(
    initial.id_fondo ? String(initial.id_fondo) : "",
  );
  const [notas, setNotas] = useState(initial.notas);

  const sumaVuelos = vuelos.reduce(
    (s, v) => s + (Number(v.costo) || 0),
    0,
  );

  const persist = (next = {}) => {
    const payload = {
      vuelos: (next.vuelos ?? vuelos).map((v) => ({
        id: v.id || crypto.randomUUID(),
        numero: (v.numero || "").trim(),
        fecha: v.fecha || null,
        origen: (v.origen || "").trim(),
        destino: (v.destino || "").trim(),
        costo: v.costo === "" || v.costo == null ? null : Number(v.costo),
        notas: (v.notas || "").trim() || null,
      })),
      costo_total:
        next.costo_total !== undefined
          ? next.costo_total === ""
            ? null
            : Number(next.costo_total)
          : costoTotal === ""
            ? null
            : Number(costoTotal),
      id_fondo:
        next.id_fondo !== undefined
          ? next.id_fondo
            ? Number(next.id_fondo)
            : null
          : idFondo
            ? Number(idFondo)
            : null,
      notas:
        next.notas !== undefined
          ? next.notas.trim() || null
          : notas.trim() || null,
      id_pago_gasto: initial.id_pago_gasto,
      id_expediente_transporte: initial.id_expediente_transporte,
    };
    onSave(payload);
  };

  return (
    <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-sky-800">
          Aéreo — compra orquesta
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="tabular-nums text-slate-600">
            Suma vuelos: ${money(sumaVuelos)}
          </span>
          {initial.id_pago_gasto ? (
            <span className="rounded bg-white px-1.5 py-0.5 font-bold text-amber-800">
              Gasto aéreo #{initial.id_pago_gasto}
              {contratacion?.id_expediente
                ? ` · exp. ${expedienteLabel(
                    (expedientes || []).find(
                      (e) =>
                        String(e.id) === String(contratacion.id_expediente),
                    ) || { id: contratacion.id_expediente },
                  )}`
                : ""}
            </span>
          ) : (
            <button
              type="button"
              className="rounded bg-amber-700 px-2 py-1 text-[10px] font-bold text-white"
              onClick={() => onRegistrarAereoComoGasto?.(contratacion)}
              title="Registra el aéreo como gasto del expediente asociado (no crea un expediente aparte)"
            >
              Registrar como gasto del expediente
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[11px]">
          <thead className="text-[10px] uppercase text-sky-700/80">
            <tr>
              <th className="px-1 py-1">Nº vuelo</th>
              <th className="px-1 py-1">Fecha</th>
              <th className="px-1 py-1">Origen</th>
              <th className="px-1 py-1">Destino</th>
              <th className="px-1 py-1 text-right">Costo</th>
              <th className="px-1 py-1">Notas</th>
              <th className="px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {vuelos.map((v, idx) => (
              <tr key={v.id || idx}>
                <td className="px-1 py-0.5">
                  <input
                    value={v.numero || ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, numero: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="w-20 rounded border border-sky-200 bg-white px-1 py-0.5"
                    placeholder="AR1234"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <input
                    type="date"
                    value={v.fecha || ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, fecha: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="rounded border border-sky-200 bg-white px-1 py-0.5"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <input
                    value={v.origen || ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, origen: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="w-16 rounded border border-sky-200 bg-white px-1 py-0.5"
                    placeholder="AEP"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <input
                    value={v.destino || ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, destino: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="w-16 rounded border border-sky-200 bg-white px-1 py-0.5"
                    placeholder="BRC"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <input
                    type="number"
                    step="0.01"
                    value={v.costo ?? ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, costo: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="w-24 rounded border border-sky-200 bg-white px-1 py-0.5 text-right"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <input
                    value={v.notas || ""}
                    onChange={(e) => {
                      const next = vuelos.map((x, i) =>
                        i === idx ? { ...x, notas: e.target.value } : x,
                      );
                      setVuelos(next);
                    }}
                    onBlur={() => persist({ vuelos })}
                    className="w-28 rounded border border-sky-200 bg-white px-1 py-0.5"
                  />
                </td>
                <td className="px-1 py-0.5">
                  <button
                    type="button"
                    className="text-rose-500"
                    title="Quitar vuelo"
                    onClick={() => {
                      const next = vuelos.filter((_, i) => i !== idx);
                      const final = next.length ? next : [emptyVuelo()];
                      setVuelos(final);
                      persist({ vuelos: final });
                    }}
                  >
                    <IconTrash size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          className="rounded border border-sky-300 bg-white px-2 py-1 text-[10px] font-bold text-sky-800"
          onClick={() => {
            const next = [...vuelos, emptyVuelo()];
            setVuelos(next);
          }}
        >
          + Vuelo
        </button>
        <div>
          <label className="block text-[9px] font-bold uppercase text-sky-700">
            Costo total
          </label>
          <input
            type="number"
            step="0.01"
            value={costoTotal}
            onChange={(e) => setCostoTotal(e.target.value)}
            onBlur={() => persist({ costo_total: costoTotal })}
            className="w-28 rounded border border-sky-200 bg-white px-1.5 py-1 text-xs text-right"
            placeholder={String(sumaVuelos || "")}
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase text-sky-700">
            Fondo
          </label>
          <select
            value={idFondo}
            onChange={(e) => {
              setIdFondo(e.target.value);
              persist({ id_fondo: e.target.value });
            }}
            className="rounded border border-sky-200 bg-white px-1.5 py-1 text-xs"
          >
            <option value="">—</option>
            {(fondos || []).map((f) => (
              <option key={f.id} value={f.id}>
                {fondoOptionLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="block text-[9px] font-bold uppercase text-sky-700">
            Notas
          </label>
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => persist({ notas })}
            className="w-full rounded border border-sky-200 bg-white px-1.5 py-1 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function ContratacionesPanel({
  rows,
  expedientes,
  fondos,
  onPatch,
  onRegistrarAereoComoGasto,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => (rows || []).find((c) => String(c.id) === String(selectedId)),
    [rows, selectedId],
  );
  const selectedArchivos = Array.isArray(selected?.archivos)
    ? selected.archivos
    : [];
  const selectedDetalle = normalizeAereoDetalle(selected?.aereo_detalle);
  const selectedAereoMissing = selected && !selected.aereo_modo;
  const selectedAereoOrquestaIncompleto =
    selected?.aereo_modo === "orquesta" &&
    !(selectedDetalle.vuelos || []).some((v) => (v.numero || "").trim());

  const expedienteOptions = useMemo(() => {
    return (expedientes || [])
      .filter(
        (ex) =>
          !ex.fecha_pago_efectuado ||
          String(ex.id) === String(selected?.id_expediente),
      )
      .map((ex) => {
        const label = [
          expedienteLabel(ex),
          expedienteGiraLabel(ex),
        ]
          .filter(Boolean)
          .join(" · ");
        return {
          value: String(ex.id),
          label,
          searchText: `${label} ${ex.nombre || ""} ${ex.numero_expediente || ""} ${ex.titular_nombre || ""}`,
        };
      });
  }, [expedientes, selected?.id_expediente]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Artista</th>
                <th className="px-3 py-2 text-right">USD</th>
                <th className="px-3 py-2 text-right">Tasa</th>
                <th className="px-3 py-2 text-right">ARS</th>
                <th className="px-3 py-2">Aéreo</th>
                <th className="px-3 py-2">Expediente</th>
                <th className="px-3 py-2">Gira</th>
                <th className="px-3 py-2 text-center">Arch.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c) => {
                const nombre = artistaLabel(c);
                const archivos = Array.isArray(c.archivos) ? c.archivos : [];
                const aereoMissing = !c.aereo_modo;
                const detalle = normalizeAereoDetalle(c.aereo_detalle);
                const aereoOrquestaIncompleto =
                  c.aereo_modo === "orquesta" &&
                  !(detalle.vuelos || []).some((v) => (v.numero || "").trim());
                const warn = aereoMissing || aereoOrquestaIncompleto;
                return (
                  <tr
                    key={c.id}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-indigo-50/40 ${
                      warn ? "bg-amber-50/70" : ""
                    }`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {nombre}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.cachet_usd != null ? money(c.cachet_usd) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {c.tasa_cambio != null ? money(c.tasa_cambio) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-800">
                      ${money(c.cachet_ars)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          warn
                            ? "font-bold text-amber-800"
                            : "text-slate-600"
                        }
                      >
                        {aereoMissing
                          ? "Sin definir"
                          : aereoModoLabel(c.aereo_modo)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.gestion_expedientes ? (
                        <span className="font-medium text-violet-800">
                          {expedienteLabel(c.gestion_expedientes)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Sin expediente</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {expedienteGiraLabel(c.gestion_expedientes) || "—"}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-slate-600">
                      {archivos.length}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(c.id);
                        }}
                      >
                        <IconEdit size={12} />
                        Abrir
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows?.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-sm text-slate-400"
                  >
                    Sin contrataciones. Creá desde el roster de una gira
                    elegible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HubDetailModal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        wide
        title={selected ? artistaLabel(selected) : ""}
        subtitle={
          selected
            ? [
                selected.gestion_expedientes
                  ? expedienteLabel(selected.gestion_expedientes)
                  : "Sin expediente",
                expedienteGiraLabel(selected.gestion_expedientes),
              ]
                .filter(Boolean)
                .join(" · ")
            : null
        }
      >
        {selected && (
          <div className="space-y-4">
            {(selectedAereoMissing || selectedAereoOrquestaIncompleto) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                {selectedAereoMissing
                  ? "Falta definir el modo aéreo."
                  : "Aéreo orquesta incompleto: cargá al menos un nº de vuelo."}
              </div>
            )}

            <div className="grid gap-3 rounded-xl border border-slate-200/70 bg-slate-50/20 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Cachet USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  key={`usd-${selected.id}-${selected.cachet_usd ?? ""}`}
                  defaultValue={selected.cachet_usd ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (
                      Number.isFinite(v) &&
                      v !== Number(selected.cachet_usd)
                    ) {
                      onPatch(selected.id, { cachet_usd: v });
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-right text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Tasa
                </label>
                <input
                  type="number"
                  step="0.0001"
                  key={`tasa-${selected.id}-${selected.tasa_cambio ?? ""}`}
                  defaultValue={selected.tasa_cambio ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (
                      Number.isFinite(v) &&
                      v !== Number(selected.tasa_cambio)
                    ) {
                      onPatch(selected.id, { tasa_cambio: v });
                    }
                  }}
                  className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-right text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Cachet ARS
                </label>
                <div className="mt-0.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-right text-sm font-black tabular-nums text-slate-800">
                  ${money(selected.cachet_ars)}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Modo aéreo
                </label>
                <select
                  value={selected.aereo_modo || ""}
                  onChange={(e) =>
                    onPatch(selected.id, {
                      aereo_modo: e.target.value || null,
                    })
                  }
                  className={`mt-0.5 w-full rounded-lg border px-2.5 py-2 text-sm ${
                    selectedAereoMissing || selectedAereoOrquestaIncompleto
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200"
                  }`}
                >
                  <option value="">— elegir —</option>
                  {AEREO_MODOS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400">
                  Expediente
                </label>
                <div className="mt-0.5">
                  <SearchableOptionPicker
                    options={expedienteOptions}
                    value={
                      selected.id_expediente
                        ? String(selected.id_expediente)
                        : ""
                    }
                    onChange={(v) =>
                      onPatch(selected.id, {
                        id_expediente: v ? Number(v) : null,
                      })
                    }
                    placeholder="Buscar expediente…"
                    emptyLabel="Sin expediente (solo abiertos)"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  Solo expedientes sin fecha de pago efectuado.
                </p>
                {selected.gestion_expedientes && (
                  <div className="mt-1 text-[11px] text-indigo-700">
                    {expedienteGiraLabel(selected.gestion_expedientes)
                      ? `Gira: ${expedienteGiraLabel(selected.gestion_expedientes)}`
                      : "Expediente sin gira"}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                  Archivos
                </label>
                <ArchivosEditor
                  archivos={selectedArchivos}
                  onChange={(next) =>
                    onPatch(selected.id, { archivos: next })
                  }
                />
              </div>
            </div>

            {selected.aereo_modo === "orquesta" && (
              <AereoOrquestaEditor
                key={`${selected.id}-${selected.updated_at || ""}-${selectedDetalle.id_pago_gasto || ""}`}
                detalle={selected.aereo_detalle}
                fondos={fondos}
                expedientes={expedientes}
                contratacion={selected}
                onSave={(payload) =>
                  onPatch(selected.id, { aereo_detalle: payload })
                }
                onRegistrarAereoComoGasto={onRegistrarAereoComoGasto}
              />
            )}
          </div>
        )}
      </HubDetailModal>
    </div>
  );
}

function ArchivosEditor({ archivos, onChange }) {
  const [url, setUrl] = useState("");
  const [nombre, setNombre] = useState("");
  return (
    <div className="space-y-1">
      {(archivos || []).map((a, idx) => (
        <div key={a.id || idx} className="flex items-center gap-1">
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-[8rem] items-center gap-0.5 truncate text-indigo-600 hover:underline"
            title={a.url}
          >
            <IconExternalLink size={10} />
            {a.nombre || "Drive"}
          </a>
          <button
            type="button"
            className="text-rose-500"
            title="Eliminar"
            onClick={() =>
              onChange((archivos || []).filter((_, i) => i !== idx))
            }
          >
            <IconTrash size={10} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="w-20 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL Drive"
          className="w-28 rounded border border-slate-200 px-1 py-0.5 text-[10px]"
        />
        <button
          type="button"
          className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-white"
          onClick={() => {
            if (!url.trim()) return;
            onChange([
              ...(archivos || []),
              {
                id: crypto.randomUUID(),
                nombre: nombre.trim() || "Archivo",
                url: url.trim(),
              },
            ]);
            setUrl("");
            setNombre("");
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function PagosPanel({
  pagos,
  fondos,
  cuentas,
  expedientes,
  onCreate,
  onPatch,
  onDelete,
}) {
  const [draft, setDraft] = useState({
    clase: "pago",
    concepto: "",
    monto: "",
    id_fondo: "",
    id_cuenta_reemplazo: "",
    id_expediente: "",
  });
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        <span className="font-bold text-emerald-700">Pago</span>: liquidación /
        desembolso del expediente.{" "}
        <span className="font-bold text-amber-700">Gasto</span>: costo operativo
        (aéreo, extras) que puede ir en el mismo expediente que un cachet. Si el
        fondo es reemplazos, hay que elegir la cuenta (con saldo actual).
      </p>
      <form
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.concepto.trim()) return;
          const idFondo = draft.id_fondo ? Number(draft.id_fondo) : null;
          const usaReemplazos = isFondoReemplazos(fondos, idFondo);
          if (usaReemplazos && !draft.id_cuenta_reemplazo) {
            toast.error(
              "Elegí la cuenta de reemplazos (se muestra el saldo actual).",
            );
            return;
          }
          await onCreate({
            clase: draft.clase || "pago",
            concepto: draft.concepto.trim(),
            monto: Number(draft.monto) || 0,
            id_fondo: idFondo,
            id_cuenta_reemplazo: usaReemplazos
              ? Number(draft.id_cuenta_reemplazo)
              : null,
            id_expediente: draft.id_expediente
              ? Number(draft.id_expediente)
              : null,
          });
          setDraft({
            clase: draft.clase || "pago",
            concepto: "",
            monto: "",
            id_fondo: "",
            id_cuenta_reemplazo: "",
            id_expediente: "",
          });
        }}
      >
        <select
          value={draft.clase || "pago"}
          onChange={(e) => setDraft((s) => ({ ...s, clase: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold shadow-sm"
        >
          {PAGO_CLASES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={draft.concepto}
          onChange={(e) =>
            setDraft((s) => ({ ...s, concepto: e.target.value }))
          }
          placeholder="Concepto"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
          required
        />
        <input
          type="number"
          step="0.01"
          value={draft.monto}
          onChange={(e) => setDraft((s) => ({ ...s, monto: e.target.value }))}
          placeholder="Monto"
          className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <select
          value={draft.id_fondo}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              id_fondo: e.target.value,
              id_cuenta_reemplazo: isFondoReemplazos(fondos, e.target.value)
                ? s.id_cuenta_reemplazo
                : "",
            }))
          }
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        >
          <option value="">Fondo…</option>
          {(fondos || []).map((f) => (
            <option key={f.id} value={f.id}>
              {fondoOptionLabel(f)}
            </option>
          ))}
        </select>
        {isFondoReemplazos(fondos, draft.id_fondo) && (
          <CuentaReemplazoSelect
            value={draft.id_cuenta_reemplazo}
            onChange={(id) =>
              setDraft((s) => ({ ...s, id_cuenta_reemplazo: id || "" }))
            }
            cuentas={cuentas}
            required
            emptyLabel="Cuenta (saldo)…"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
          />
        )}
        <select
          value={draft.id_expediente}
          onChange={(e) =>
            setDraft((s) => ({ ...s, id_expediente: e.target.value }))
          }
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        >
          <option value="">Sin expediente</option>
          {(expedientes || []).map((ex) => (
            <option key={ex.id} value={ex.id}>
              {expedienteLabel(ex)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          + Agregar
        </button>
      </form>
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-2 py-1.5">Clase</th>
            <th className="px-2 py-1.5">Concepto</th>
            <th className="px-2 py-1.5 text-right">Monto</th>
            <th className="px-2 py-1.5">Fondo / cuenta</th>
            <th className="px-2 py-1.5">Expediente</th>
            <th className="px-2 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {(pagos || []).map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="px-2 py-1.5">
                <select
                  value={p.clase || "pago"}
                  onChange={(e) => onPatch(p.id, { clase: e.target.value })}
                  className={`rounded border px-1.5 py-1 text-[10px] font-bold ${
                    p.clase === "gasto"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {PAGO_CLASES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <input
                  key={`pago-c-${p.id}-${p.concepto}`}
                  defaultValue={p.concepto || ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== p.concepto) onPatch(p.id, { concepto: v });
                  }}
                  className="w-full min-w-[8rem] rounded border border-slate-200 px-1.5 py-1 font-medium"
                />
              </td>
              <td className="px-2 py-1.5 text-right">
                <input
                  type="number"
                  step="0.01"
                  key={`pago-m-${p.id}-${p.monto}`}
                  defaultValue={p.monto ?? ""}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== Number(p.monto)) {
                      onPatch(p.id, { monto: v });
                    }
                  }}
                  className="w-28 rounded border border-slate-200 px-1.5 py-1 text-right font-bold tabular-nums"
                />
              </td>
              <td className="px-2 py-1.5">
                <div className="flex min-w-[10rem] flex-col gap-1">
                  <select
                    value={p.id_fondo || ""}
                    onChange={(e) => {
                      const idFondo = e.target.value
                        ? Number(e.target.value)
                        : null;
                      const patch = { id_fondo: idFondo };
                      if (!isFondoReemplazos(fondos, idFondo)) {
                        patch.id_cuenta_reemplazo = null;
                      }
                      onPatch(p.id, patch);
                    }}
                    className="rounded border border-slate-200 px-1 py-1"
                  >
                    <option value="">Sin fondo</option>
                    {(fondos || []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {fondoOptionLabel(f)}
                      </option>
                    ))}
                  </select>
                  {isFondoReemplazos(fondos, p.id_fondo) && (
                    <CuentaReemplazoSelect
                      value={p.id_cuenta_reemplazo}
                      onChange={(id) =>
                        onPatch(p.id, { id_cuenta_reemplazo: id })
                      }
                      cuentas={cuentas}
                      required
                      emptyLabel="Cuenta (saldo)…"
                    />
                  )}
                </div>
              </td>
              <td className="px-2 py-1.5">
                <select
                  value={p.id_expediente || ""}
                  onChange={(e) =>
                    onPatch(p.id, {
                      id_expediente: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="max-w-[14rem] rounded border border-slate-200 px-1 py-1"
                >
                  <option value="">Sin expediente</option>
                  {(expedientes || []).map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {expedienteLabel(ex)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  type="button"
                  className="text-rose-500"
                  onClick={() => onDelete(p.id)}
                >
                  <IconTrash size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductoresPanel({ productores, onCreate }) {
  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [mail, setMail] = useState("");
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200/70 bg-slate-50/25 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          await onCreate({
            nombre: nombre.trim(),
            cuit: cuit.trim() || null,
            mail: mail.trim() || null,
          });
          setNombre("");
          setCuit("");
          setMail("");
        }}
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
          required
        />
        <input
          value={cuit}
          onChange={(e) => setCuit(e.target.value)}
          placeholder="CUIT"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <input
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          placeholder="Mail"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          + Productor
        </button>
      </form>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {(productores || []).map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span className="font-bold text-slate-800">{p.nombre}</span>
            <span className="text-xs text-slate-500">
              {[p.cuit, p.mail].filter(Boolean).join(" · ") || "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
