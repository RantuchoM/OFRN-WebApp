import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { exportViaticosToPDFForm } from "../../utils/pdfFormExporter";
import { calculateDaysDiff } from "../../hooks/viaticos/useViaticosIndividuales";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import SearchableSelect from "../../components/ui/SearchableSelect";
import ManualHeader from "../../components/public/ManualHeader";
import {
  IconCalculator,
  IconFileDownload,
  IconDownload,
  IconTrash,
  IconUpload,
} from "../../components/ui/Icons";

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmtMoneyPreview = (val) =>
  toNumber(val).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbSsEWy2XWoa-NLD4a_vk8XdUWo2a9qz9y-hKQKaljcptw_eSy-C3mRU7Kb8IwO2pnD3sL7qt-dWbd/pub?gid=0&single=true&output=csv";

const STORAGE_KEY = "ofrn_manual_viatico_data";
const LOCALIDADES_DATALIST_ID = "viaticos_manual_localidades";

const normalizeHeader = (h) =>
  String(h || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

// Parser CSV simple con soporte de comillas dobles y separador coma.
// Devuelve array de filas (array de celdas).
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (c === ",")) {
      pushCell();
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && next === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cell += c;
  }
  // Última celda/fila
  pushCell();
  // Evitar agregar fila vacía final si el archivo termina en newline
  const isLastRowEmpty = row.every((v) => String(v || "").trim() === "");
  if (!isLastRowEmpty) pushRow();

  return rows;
};

const MiniCalcBox = ({ valorDiarioCalc, dias, subtotal, className = "" }) => {
  return (
    <div
      className={`mt-3 md:mt-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Cálculo en vivo
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Valor diario
          </div>
          <div className="text-sm font-black text-slate-800">
            {fmtMoneyPreview(valorDiarioCalc)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Días
          </div>
          <div className="text-sm font-black text-slate-800">{String(dias || 0)}</div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Anticipo
          </div>
          <div className="text-sm font-black text-slate-800">{fmtMoneyPreview(subtotal)}</div>
        </div>
      </div>
    </div>
  );
};

const MiniValueBox = ({ label, value, className = "" }) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-800">{value}</div>
    </div>
  );
};

const completedFieldClass =
  "border-emerald-300 bg-emerald-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";
const baseFieldClass =
  "border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none px-3 py-2";
const inputClass = (val) => {
  const isFilled = String(val ?? "").trim() !== "" && String(val ?? "").trim() !== "0";
  return `${baseFieldClass} ${isFilled ? completedFieldClass : "bg-white"}`;
};

const DEFAULT_FORM = {
  // Personales
  apellido: "",
  nombre: "",
  dni: "",
  cargo: "",
  jornada_laboral: "",
  ciudad_origen: "",
  asiento_habitual: "",

  // Comisión
  motivo: "",
  lugar_comision: "",
  fecha_salida: "",
  hora_salida: "",
  fecha_llegada: "",
  hora_llegada: "",

  // Financieros
  valor_diario_base: 0, // debe iniciar en 0
  temporada_alta: false, // +30%
  porcentaje: 100,

  // Transporte (checks + detalles)
  check_aereo: false,
  check_terrestre: false,
  check_patente_oficial: false,
  patente_oficial: "",
  check_patente_particular: false,
  patente_particular: "",
  check_otros: false,
  transporte_otros_detalle: "",

  // Gastos
  gasto_alojamiento: 0,
  gasto_pasajes: 0,
  gasto_combustible: 0,
  gasto_otros: 0,
  gastos_capacit: 0,
  gastos_movil_otros: 0,
  gasto_ceremonial: 0,
};

export default function ViaticosManual() {
  const importFileRef = useRef(null);
  const [loadedFromStorage] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_FORM;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return DEFAULT_FORM;
      return { ...DEFAULT_FORM, ...parsed };
    } catch {
      return DEFAULT_FORM;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore (storage full / disabled)
    }
  }, [form]);

  const [personas, setPersonas] = useState([]); // [{...}]
  const [localidades, setLocalidades] = useState([]); // [string]
  const [montoDefault, setMontoDefault] = useState(0);
  const [csvStatus, setCsvStatus] = useState({ loading: true, error: "" });
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setCsvStatus({ loading: true, error: "" });
      try {
        const res = await fetch(CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const rawRows = parseCsv(text || "");
        if (!rawRows || rawRows.length === 0) throw new Error("CSV vacío");

        const header = rawRows[0].map(normalizeHeader);
        const idx = (name) => header.indexOf(normalizeHeader(name));
        const idxFirstMatch = (pred) => header.findIndex((h) => pred(h));

        // Columna de localidades: preferimos "localidades"; si no existe,
        // tomamos cualquier encabezado que contenga "localidad".
        const idxLocalidades =
          idx("localidades") !== -1
            ? idx("localidades")
            : idxFirstMatch((h) => h.includes("localidad"));

        const get = (row, name) => {
          const i = idx(name);
          if (i < 0) return "";
          return row[i] ?? "";
        };
        const getByIdx = (row, i) => (i >= 0 ? (row[i] ?? "") : "");

        const people = [];
        const locSet = new Set();
        let maxValorDiario = 0;

        for (let r = 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          // Localidades y valor diario pueden venir en filas no asociadas a una persona.
          const locRaw = String(getByIdx(row, idxLocalidades) || "").trim();
          if (locRaw) {
            locRaw
              .split(/[;|]/g)
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((l) => locSet.add(l));
          }

          const valorDiarioRaw = get(row, "valor_diario");
          const valorDiario = toNumber(valorDiarioRaw);
          if (valorDiario > maxValorDiario) maxValorDiario = valorDiario;

          const apellido = String(get(row, "apellido") || "").trim();
          const nombre = String(get(row, "nombre") || "").trim();
          if (!apellido || !nombre) continue;

          const dni = String(get(row, "dni") || "").trim();
          const cargo = String(get(row, "cargo") || "").trim();
          const jornada = String(get(row, "jornada") || "").trim();
          const ciudad_origen = String(get(row, "ciudad_origen") || "").trim();
          const asiento_habitual = String(get(row, "asiento_habitual") || "").trim();

          people.push({
            id: `${apellido}__${nombre}__${dni || r}`,
            apellido,
            nombre,
            dni,
            cargo,
            jornada,
            ciudad_origen,
            asiento_habitual,
          });
        }

        const locs = Array.from(locSet).sort((a, b) => a.localeCompare(b, "es"));

        if (!cancelled) {
          setPersonas(people);
          setLocalidades(locs);
          setMontoDefault(maxValorDiario || 0);
          setCsvStatus({ loading: false, error: "" });

          // Inicializar valor diario base con el "maestro" del CSV
          // sin pisar un valor ya cargado/persistido (distinto de 0).
          if ((maxValorDiario || 0) > 0) {
            setForm((prev) => {
              const current = toNumber(prev.valor_diario_base);
              if (current > 0) return prev;
              return { ...prev, valor_diario_base: maxValorDiario };
            });
          }
        }
      } catch (e) {
        if (cancelled) return;
        setCsvStatus({
          loading: false,
          error: "No se pudo cargar la base externa (CSV). Podés completar manualmente.",
        });
        setPersonas([]);
        setLocalidades([]);
        setMontoDefault(0);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [loadedFromStorage]);

  const personaOptions = useMemo(() => {
    return (personas || []).map((p) => ({
      id: p.id,
      label: `${p.apellido}, ${p.nombre}${p.dni ? ` (${p.dni})` : ""}`,
      subLabel: [p.cargo, p.jornada].filter(Boolean).join(" · "),
    }));
  }, [personas]);

  const handleImportPersona = (id) => {
    setSelectedPersonaId(id);
    const p = (personas || []).find((x) => String(x.id) === String(id));
    if (!p) return;
    setForm((prev) => ({
      ...prev,
      apellido: p.apellido || "",
      nombre: p.nombre || "",
      dni: p.dni || "",
      cargo: p.cargo || prev.cargo || "",
      jornada_laboral: p.jornada || prev.jornada_laboral || "",
      ciudad_origen: p.ciudad_origen || prev.ciudad_origen || "",
      asiento_habitual: p.asiento_habitual || prev.asiento_habitual || "",
    }));
  };

  const dias_computables = useMemo(() => {
    return calculateDaysDiff(
      form.fecha_salida,
      form.hora_salida,
      form.fecha_llegada,
      form.hora_llegada,
    );
  }, [form.fecha_salida, form.hora_salida, form.fecha_llegada, form.hora_llegada]);

  const factor_temporada = form.temporada_alta ? 0.3 : 0;

  const valorDiarioCalc = useMemo(() => {
    const base = toNumber(form.valor_diario_base);
    const pct = toNumber(form.porcentaje) / 100;
    const basePorcentaje = round2(base * pct);
    return round2(basePorcentaje * (1 + factor_temporada));
  }, [form.valor_diario_base, form.porcentaje, factor_temporada]);

  const subtotal = useMemo(() => {
    return round2(toNumber(dias_computables) * toNumber(valorDiarioCalc));
  }, [dias_computables, valorDiarioCalc]);

  const totalGastos = useMemo(() => {
    return round2(
      toNumber(form.gasto_alojamiento) +
        toNumber(form.gasto_pasajes) +
        toNumber(form.gasto_combustible) +
        toNumber(form.gasto_otros) +
        toNumber(form.gastos_capacit) +
        toNumber(form.gastos_movil_otros) +
        toNumber(form.gasto_ceremonial),
    );
  }, [
    form.gasto_alojamiento,
    form.gasto_pasajes,
    form.gasto_combustible,
    form.gasto_otros,
    form.gastos_capacit,
    form.gastos_movil_otros,
    form.gasto_ceremonial,
  ]);

  const totalFinal = useMemo(() => round2(subtotal + totalGastos), [subtotal, totalGastos]);

  const update = (key) => (e) => {
    const { type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [key]: type === "checkbox" ? checked : value,
    }));
  };

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateNumber = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleDownload = async () => {
    const configData = {
      lugar_comision: form.lugar_comision || "",
      motivo: form.motivo || "",
      factor_temporada,
      keep_editable: true,
    };

    const viaticoRow = {
      apellido: form.apellido || "",
      nombre: form.nombre || "",
      dni: form.dni || "",
      cargo: form.cargo || "",
      jornada_laboral: form.jornada_laboral || "",
      ciudad_origen: form.ciudad_origen || "",
      asiento_habitual: form.asiento_habitual || "",

      motivo: form.motivo || "",
      lugar_comision: form.lugar_comision || "",
      fecha_salida: form.fecha_salida || "",
      hora_salida: form.hora_salida || "",
      fecha_llegada: form.fecha_llegada || "",
      hora_llegada: form.hora_llegada || "",

      dias_computables,
      porcentaje: toNumber(form.porcentaje),
      valorDiarioCalc,
      subtotal,

      check_aereo: !!form.check_aereo,
      check_terrestre: !!form.check_terrestre,
      check_patente_oficial: !!form.check_patente_oficial,
      patente_oficial: form.patente_oficial || "",
      check_patente_particular: !!form.check_patente_particular,
      patente_particular: form.patente_particular || "",
      check_otros: !!form.check_otros,
      transporte_otros_detalle: form.transporte_otros_detalle || "",

      gasto_alojamiento: toNumber(form.gasto_alojamiento),
      gasto_pasajes: toNumber(form.gasto_pasajes),
      gastos_movilidad: toNumber(form.gasto_pasajes), // compatibilidad (PDF usa gasto_pasajes || gastos_movilidad)
      gasto_combustible: toNumber(form.gasto_combustible),
      gasto_otros: toNumber(form.gasto_otros),
      gastos_capacit: toNumber(form.gastos_capacit),
      gastos_movil_otros: toNumber(form.gastos_movil_otros),
      gasto_ceremonial: toNumber(form.gasto_ceremonial),

      totalFinal,

      // Importante: sin firma digital (firma ológrafa posterior)
      firma: null,
    };

    const pdfBytes = await exportViaticosToPDFForm({}, [viaticoRow], configData, "viatico");
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const safeName = `${(form.apellido || "Viaticos").trim()}_${(form.nombre || "Manual").trim()}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    saveAs(blob, `${safeName}_Viaticos.pdf`);
  };

  const handleClear = () => {
    const ok = confirm("¿Limpiar planilla? Se perderán los datos cargados en esta vista.");
    if (!ok) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setForm(DEFAULT_FORM);
  };

  const handleExportCsv = () => {
    const payload = {
      ...form,
      dias_computables,
      factor_temporada,
      valorDiarioCalc,
      subtotal,
      totalGastos,
      totalFinal,
    };
    const keys = Object.keys(payload);
    const escape = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      const needs = /[",\n\r]/.test(s);
      const safe = s.replace(/"/g, '""');
      return needs ? `"${safe}"` : safe;
    };
    const csv = `${keys.join(",")}\n${keys.map((k) => escape(payload[k])).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const safeName = `${(form.apellido || "Viaticos").trim()}_${(form.nombre || "Manual").trim()}`
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    saveAs(blob, `${safeName}_Viatico_Datos_Rendicion.csv`);
  };

  const handleImportCsv = async (file) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text || "");
      if (!rows || rows.length < 2) return;
      const header = rows[0].map((h) => String(h || "").trim());
      const row = rows[1];
      const get = (name) => {
        const idx = header.indexOf(name);
        if (idx < 0) return "";
        return row[idx] ?? "";
      };
      setForm((prev) => ({
        ...prev,
        apellido: get("apellido") || prev.apellido,
        nombre: get("nombre") || prev.nombre,
        dni: get("dni") || prev.dni,
        cargo: get("cargo") || prev.cargo,
        jornada_laboral: get("jornada_laboral") || prev.jornada_laboral,
        ciudad_origen: get("ciudad_origen") || prev.ciudad_origen,
        asiento_habitual: get("asiento_habitual") || prev.asiento_habitual,
        motivo: get("motivo") || prev.motivo,
        lugar_comision: get("lugar_comision") || prev.lugar_comision,
        fecha_salida: get("fecha_salida") || prev.fecha_salida,
        hora_salida: get("hora_salida") || prev.hora_salida,
        fecha_llegada: get("fecha_llegada") || prev.fecha_llegada,
        hora_llegada: get("hora_llegada") || prev.hora_llegada,
        valor_diario_base: get("valor_diario_base") !== "" ? get("valor_diario_base") : prev.valor_diario_base,
        porcentaje: get("porcentaje") !== "" ? get("porcentaje") : prev.porcentaje,
        temporada_alta:
          String(get("temporada_alta") || "").toLowerCase() === "true" || String(get("temporada_alta") || "") === "1"
            ? true
            : String(get("temporada_alta") || "").toLowerCase() === "false" || String(get("temporada_alta") || "") === "0"
              ? false
              : prev.temporada_alta,
        gasto_alojamiento: get("gasto_alojamiento") !== "" ? get("gasto_alojamiento") : prev.gasto_alojamiento,
        gasto_pasajes: get("gasto_pasajes") !== "" ? get("gasto_pasajes") : prev.gasto_pasajes,
        gasto_combustible: get("gasto_combustible") !== "" ? get("gasto_combustible") : prev.gasto_combustible,
        gasto_otros: get("gasto_otros") !== "" ? get("gasto_otros") : prev.gasto_otros,
        gastos_capacit: get("gastos_capacit") !== "" ? get("gastos_capacit") : prev.gastos_capacit,
        gastos_movil_otros: get("gastos_movil_otros") !== "" ? get("gastos_movil_otros") : prev.gastos_movil_otros,
        gasto_ceremonial: get("gasto_ceremonial") !== "" ? get("gasto_ceremonial") : prev.gasto_ceremonial,
      }));
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <ManualHeader
          rightActions={
            <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 text-sm font-black hover:bg-slate-50 active:bg-slate-50 transition"
                title="Importar CSV"
              >
                <IconUpload size={18} className="text-slate-600" />
                Importar
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportCsv(f);
                  e.target.value = "";
                }}
              />
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-700 text-sm font-black hover:bg-slate-50 active:bg-slate-50 transition"
                title="Exportar CSV (para rendición)"
              >
                <IconDownload size={18} className="text-slate-600" />
                Exportar
              </button>
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-3 py-2 text-rose-700 bg-rose-50 text-sm font-black hover:bg-rose-100 active:bg-rose-100 transition"
                title="Limpiar planilla"
              >
                <IconTrash size={18} className="text-slate-600" />
                Limpiar planilla
              </button>
              <div className="w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition"
                title="Descargar PDF"
              >
                <IconFileDownload size={18} />
                Descargar Planilla
              </button>
            </div>
          }
        />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 pt-5">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <IconCalculator size={20} className="text-indigo-600" />
              Viáticos Manual (Secretaría)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Carga manual sin login. Exporta la planilla oficial en PDF (DECTO-2025-867-E-GDERNE-RNE).
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Importación externa */}
            <section className="space-y-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 md:p-5">
                <button
                  type="button"
                  onClick={() => setImportOpen((v) => !v)}
                  className="w-full flex items-start justify-between gap-4 text-left"
                  aria-expanded={importOpen}
                >
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-indigo-700">
                      Importar y editar datos de persona (base externa)
                    </div>
                    <div className="text-[11px] text-indigo-800/80 mt-1">
                      Completá rápidamente datos personales y localidades desde Google Sheets.
                    </div>
                  </div>
                  <div className="shrink-0 text-indigo-700 font-black text-xs mt-0.5">
                    {importOpen ? "Ocultar ▴" : "Mostrar ▾"}
                  </div>
                </button>

                {importOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch mt-4">
                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col">
                      <div className="text-xs font-bold text-indigo-900/80">
                        Importar Datos de Persona
                      </div>
                      <div className="mt-2">
                        <SearchableSelect
                          options={personaOptions}
                          value={selectedPersonaId}
                          onChange={handleImportPersona}
                          placeholder={
                            csvStatus.loading
                              ? "Cargando base..."
                              : personas.length > 0
                                ? "Buscar por apellido/nombre/DNI..."
                                : "Base no disponible (carga manual)"
                          }
                        />
                      </div>
                    </div>

                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                        Valor diario maestro (CSV)
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-800">
                        {montoDefault > 0 ? fmtMoneyPreview(montoDefault) : "—"}
                      </div>
                      {!csvStatus.loading && !csvStatus.error && localidades.length === 0 && (
                        <div className="mt-1 text-[11px] text-slate-600">
                          No se encontraron localidades en el CSV (columna{" "}
                          <strong>localidades</strong>).
                        </div>
                      )}
                      {csvStatus.error && (
                        <div className="mt-1 text-[11px] text-slate-600">{csvStatus.error}</div>
                      )}
                      <div className="flex-1" />
                    </div>

                    <div className="h-full rounded-xl border border-indigo-100 bg-white/70 px-4 py-3 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          Datos base
                        </div>
                        <div className="mt-1 text-[11px] text-indigo-700/80 leading-snug">
                          Tené en cuenta que tarda unos minutos en actualizar
                        </div>
                      </div>
                      <a
                        href="https://docs.google.com/spreadsheets/d/1qMaN5c8Ss3QNk2QPAQZ86X1jM8J4f8mToM2600Dls1M/edit?gid=657797988#gid=657797988"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 active:scale-[0.99] transition"
                        title="Editar datos base (Google Sheets)"
                      >
                        Editar datos base
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Personales */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Datos personales
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Apellido
                  <input
                    className={`mt-1 w-full ${inputClass(form.apellido)}`}
                    value={form.apellido}
                    onChange={update("apellido")}
                    placeholder="Apellido"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Nombre
                  <input
                    className={`mt-1 w-full ${inputClass(form.nombre)}`}
                    value={form.nombre}
                    onChange={update("nombre")}
                    placeholder="Nombre"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  DNI
                  <input
                    className={`mt-1 w-full ${inputClass(form.dni)}`}
                    value={form.dni}
                    onChange={update("dni")}
                    placeholder="DNI"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-4">
                  Cargo
                  <input
                    className={`mt-1 w-full ${inputClass(form.cargo)}`}
                    value={form.cargo}
                    onChange={update("cargo")}
                    placeholder="Cargo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Jornada
                  <input
                    className={`mt-1 w-full ${inputClass(form.jornada_laboral)}`}
                    value={form.jornada_laboral}
                    onChange={update("jornada_laboral")}
                    placeholder="Ej: 8 a 14"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-3">
                  Ciudad origen
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(form.ciudad_origen)}`}
                    value={form.ciudad_origen}
                    onChange={update("ciudad_origen")}
                    placeholder="Ciudad origen (p/ el campo Lugar y fecha)"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-3">
                  Asiento habitual
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(form.asiento_habitual)}`}
                    value={form.asiento_habitual}
                    onChange={update("asiento_habitual")}
                    placeholder="Asiento habitual"
                  />
                </label>
              </div>
            </section>

            {/* Comisión */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Comisión
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Motivo
                  <input
                    className={`mt-1 w-full ${inputClass(form.motivo)}`}
                    value={form.motivo}
                    onChange={update("motivo")}
                    placeholder="Motivo"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2">
                  Lugar comisión
                  <input
                    type="text"
                    autoComplete="off"
                    list={LOCALIDADES_DATALIST_ID}
                    className={`mt-1 w-full ${inputClass(form.lugar_comision)}`}
                    value={form.lugar_comision}
                    onChange={update("lugar_comision")}
                    placeholder="Lugar"
                  />
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-1">
                  Fecha salida
                  <div className="mt-1">
                    <DateInput
                      value={form.fecha_salida}
                      onChange={(v) => setValue("fecha_salida", v)}
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        form.fecha_salida ? "!border-emerald-200 !bg-emerald-50/50" : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-2 md:col-start-2">
                  Hora salida
                  <div className="mt-1">
                    <TimeInput
                      value={form.hora_salida}
                      onChange={(v) => setValue("hora_salida", v || "")}
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(form.hora_salida || "").trim() ? "border-emerald-300 bg-emerald-50" : "bg-white"
                      }`}
                    />
                  </div>
                </label>
                <MiniCalcBox
                  className="md:row-start-2 md:col-start-3 md:col-span-2 md:row-span-2 md:self-stretch px-5 py-4"
                  valorDiarioCalc={valorDiarioCalc}
                  dias={dias_computables}
                  subtotal={subtotal}
                />

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-1">
                  Fecha llegada
                  <div className="mt-1">
                    <DateInput
                      value={form.fecha_llegada}
                      onChange={(v) => setValue("fecha_llegada", v)}
                      showDayName={false}
                      className={`!py-1.5 !pl-8 !pr-2 !rounded-lg text-xs ${
                        form.fecha_llegada ? "!border-emerald-200 !bg-emerald-50/50" : ""
                      }`}
                    />
                  </div>
                </label>

                <label className="text-xs font-bold text-slate-600 md:row-start-3 md:col-start-2">
                  Hora llegada
                  <div className="mt-1">
                    <TimeInput
                      value={form.hora_llegada}
                      onChange={(v) => setValue("hora_llegada", v || "")}
                      className={`border border-slate-300 rounded-lg outline-none px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/30 ${
                        String(form.hora_llegada || "").trim() ? "border-emerald-300 bg-emerald-50" : "bg-white"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* Financieros */}
            <section className="space-y-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Cálculo
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <label className="text-xs font-bold text-slate-600">
                  Valor diario base
                  <input
                    inputMode="decimal"
                    className={`mt-1 w-full ${inputClass(form.valor_diario_base)}`}
                    value={form.valor_diario_base}
                    onChange={updateNumber("valor_diario_base")}
                    onFocus={() => {
                      if (String(form.valor_diario_base ?? "").trim() === "0") setValue("valor_diario_base", "");
                    }}
                    placeholder="0"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  % viático
                  <select
                    className={`mt-1 w-full ${baseFieldClass} bg-emerald-50 border-emerald-300`}
                    value={String(form.porcentaje)}
                    onChange={update("porcentaje")}
                  >
                    <option value="100">100%</option>
                    <option value="80">80%</option>
                    <option value="0">0%</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                  <div>
                    <div className="text-xs font-black text-slate-700">Temporada alta</div>
                    <div className="text-[11px] text-slate-500">+30% (factor 0,30)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.temporada_alta}
                    onChange={update("temporada_alta")}
                    className="h-5 w-5 accent-indigo-600"
                  />
                </label>
                <MiniValueBox
                  label="Valor diario calculado"
                  value={fmtMoneyPreview(valorDiarioCalc)}
                  className="md:self-stretch"
                />
              </div>
            </section>

            {/* Transporte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* Transporte (columna izquierda) */}
              <section className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Transporte (para tildes en PDF)
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white">
                    <input
                      type="checkbox"
                      checked={form.check_aereo}
                      onChange={update("check_aereo")}
                      className="h-5 w-5 accent-indigo-600"
                    />
                    <span className="text-sm font-bold text-slate-700">Aéreo</span>
                  </label>
                  <label className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-white">
                    <input
                      type="checkbox"
                      checked={form.check_terrestre}
                      onChange={update("check_terrestre")}
                      className="h-5 w-5 accent-indigo-600"
                    />
                    <span className="text-sm font-bold text-slate-700">Terrestre</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.check_patente_oficial}
                        onChange={update("check_patente_oficial")}
                        className="h-5 w-5 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-700">Vehículo oficial</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Patente oficial
                      <input
                        className={`mt-1 w-full ${inputClass(form.patente_oficial)}`}
                        value={form.patente_oficial}
                        onChange={update("patente_oficial")}
                        placeholder="AAA000"
                      />
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.check_patente_particular}
                        onChange={update("check_patente_particular")}
                        className="h-5 w-5 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-700">Vehículo particular</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Patente particular
                      <input
                        className={`mt-1 w-full ${inputClass(form.patente_particular)}`}
                        value={form.patente_particular}
                        onChange={update("patente_particular")}
                        placeholder="AAA000"
                      />
                    </label>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.check_otros}
                        onChange={update("check_otros")}
                        className="h-5 w-5 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-700">Otro</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600">
                      Descripción “Otro”
                      <input
                        className={`mt-1 w-full ${inputClass(form.transporte_otros_detalle)}`}
                        value={form.transporte_otros_detalle}
                        onChange={update("transporte_otros_detalle")}
                        placeholder="Detalle"
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* Gastos (columna derecha) */}
              <section className="space-y-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Gastos
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 block">
                    Alojamiento
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gasto_alojamiento)}`}
                      value={form.gasto_alojamiento}
                      onChange={updateNumber("gasto_alojamiento")}
                      onFocus={() => {
                        if (String(form.gasto_alojamiento ?? "").trim() === "0") setValue("gasto_alojamiento", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Pasajes / Movilidad
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gasto_pasajes)}`}
                      value={form.gasto_pasajes}
                      onChange={updateNumber("gasto_pasajes")}
                      onFocus={() => {
                        if (String(form.gasto_pasajes ?? "").trim() === "0") setValue("gasto_pasajes", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Combustible
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gasto_combustible)}`}
                      value={form.gasto_combustible}
                      onChange={updateNumber("gasto_combustible")}
                      onFocus={() => {
                        if (String(form.gasto_combustible ?? "").trim() === "0")
                          setValue("gasto_combustible", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Otros (columna “Otros”)
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gasto_otros)}`}
                      value={form.gasto_otros}
                      onChange={updateNumber("gasto_otros")}
                      onFocus={() => {
                        if (String(form.gasto_otros ?? "").trim() === "0") setValue("gasto_otros", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Capacitación
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gastos_capacit)}`}
                      value={form.gastos_capacit}
                      onChange={updateNumber("gastos_capacit")}
                      onFocus={() => {
                        if (String(form.gastos_capacit ?? "").trim() === "0") setValue("gastos_capacit", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Ceremonial
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gasto_ceremonial)}`}
                      value={form.gasto_ceremonial}
                      onChange={updateNumber("gasto_ceremonial")}
                      onFocus={() => {
                        if (String(form.gasto_ceremonial ?? "").trim() === "0") setValue("gasto_ceremonial", "");
                      }}
                      placeholder="0"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-600 block">
                    Otros movilidad
                    <input
                      inputMode="decimal"
                      className={`mt-1 w-full ${inputClass(form.gastos_movil_otros)}`}
                      value={form.gastos_movil_otros}
                      onChange={updateNumber("gastos_movil_otros")}
                      onFocus={() => {
                        if (String(form.gastos_movil_otros ?? "").trim() === "0")
                          setValue("gastos_movil_otros", "");
                      }}
                      placeholder="0"
                    />
                  </label>

                  <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    El PDF calcula y muestra <strong>Subtotal</strong> y <strong>Total</strong> a partir de
                    los valores ingresados arriba. El campo <strong>Firma</strong> se exporta vacío
                    (firma ológrafa posterior).
                  </div>
                </div>
              </section>
            </div>

            {/* Resumen (al final) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Gastos (total)
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(totalGastos)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Valor diario (cálculo)
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(valorDiarioCalc)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Base: <span className="font-bold">{fmtMoneyPreview(form.valor_diario_base)}</span>{" "}
                  · %: <span className="font-bold">{String(form.porcentaje || 0)}%</span> · Temp:{" "}
                  <span className="font-bold">{form.temporada_alta ? "ALTA (+30%)" : "BAJA"}</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Subtotal (anticipo)
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(subtotal)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Total final
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {fmtMoneyPreview(totalFinal)}
                </div>
              </div>
            </div>

            {/* Datalist (sugerencias de localidades; permite texto libre) */}
            <datalist id={LOCALIDADES_DATALIST_ID}>
              {(localidades || []).map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
        </div>
      </div>
    </div>
  );
}

