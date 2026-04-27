import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { IconCamera } from "../../../components/ui/Icons";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import { supabase } from "../../../services/supabase";
import {
  adminUpdateUsuarioRol,
  getAdminConciertoStats,
  adminUpsertConcierto,
  adminUpsertPrograma,
  blobToPdfBase64ForMail,
  buildEntradasReservaPdfConDataUrls,
  computeDisponibles,
  crearReserva,
  cancelarReserva,
  descargarPdfDesdeReservaRow,
  enviarMailCancelacionReserva,
  enviarMailReserva,
  getConciertoBySlug,
  listAdminData,
  listConciertoIdsConReservaActiva,
  listarMisReservas,
  listProgramasConConciertos,
  previewEntradaQr,
  tokenToQrDataUrl,
  validarYConsumirQr,
} from "../../../services/entradaService";
import { downloadEntradasReservaPdfBlob } from "../../../utils/entradasReservaPdf";
import {
  formatEntradasPreviewError,
  formatEntradasValidacionError,
  formatEntradasValidacionSuccess,
} from "../../../utils/entradasQrMessages";
import { decodeQrFromImageFile } from "../../../utils/qrDecodeFromImage";

const ADMIN_TABS = ["programas", "conciertos", "usuarios"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateLongEs(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase();
  const day = parts.find((p) => p.type === "day")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";
  return `${weekday}, ${day} de ${month} de ${year}`;
}

function getProgramaNombre(programa) {
  if (!programa) return "Programa sin nombre";
  return (
    programa.nombre_gira
    || programa.nomenclador
    || programa.subtitulo
    || `Programa ${programa.id || "-"}`
  );
}

function buildProgramaLabel(programa) {
  const nombre = getProgramaNombre(programa);
  const prefijos = [programa?.nomenclador, programa?.mes_letra]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (!prefijos.length) return nombre;
  return `${prefijos.join(" · ")} · ${nombre}`;
}

function entradasBloqueoIngreso(p) {
  if (!p || !p.ok) return "";
  if (p.puede_ingresar) return "";
  if (p.tipo === "entrada") {
    if (p.reserva_estado && p.reserva_estado !== "activa") {
      return "La reserva asociada no está activa (p. ej. cancelada).";
    }
    if (p.estado_ingreso === "ingresada") {
      return "Esta entrada ya registró ingreso a sala.";
    }
    return "No se puede completar el ingreso con este estado.";
  }
  if (p.tipo === "reserva") {
    if (p.reserva_estado && p.reserva_estado !== "activa") {
      return "La reserva no está activa (p. ej. cancelada).";
    }
    if (!p.pendientes) {
      return "No quedan plazas pendientes: las entradas de este QR ya se registraron.";
    }
  }
  return "";
}

function recepcionPanelClass(p) {
  if (!p) return "bg-slate-50 border-slate-200";
  if (!p.ok) {
    if (p.reason === "concierto_distinto") return "bg-orange-50/95 border-orange-300";
    return "bg-rose-50/95 border-rose-200";
  }
  if (p.tipo === "entrada") {
    if (p.reserva_estado && p.reserva_estado !== "activa") return "bg-orange-100/95 border-orange-300";
    if (p.estado_ingreso === "ingresada") return "bg-orange-100/95 border-orange-300";
    return "bg-emerald-100/95 border-emerald-300";
  }
  if (p.tipo === "reserva") {
    if (p.reserva_estado === "cancelada" || p.pendientes === 0) return "bg-orange-100/95 border-orange-300";
    if (p.ingresadas > 0 && p.pendientes > 0) return "bg-sky-100/95 border-sky-400";
    return "bg-emerald-100/95 border-emerald-300";
  }
  return "bg-slate-100 border-slate-200";
}

function isManualReservaCodeInput(value) {
  const token = String(value || "").trim();
  if (!token) return false;
  if (/^\d{10}$/.test(token)) return true;
  return /^ENT-RSV(?:-[A-Z0-9]+)*-\d{10}$/i.test(token);
}

function normalizeDriveImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const fileIdFromPath = raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileIdFromPath?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileIdFromPath[1]}&sz=w1600`;
  }
  const fileIdFromQuery = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (fileIdFromQuery?.[1] && raw.includes("drive.google.com")) {
    return `https://drive.google.com/thumbnail?id=${fileIdFromQuery[1]}&sz=w1600`;
  }
  return raw;
}

export default function EntradasMain({ user, profile, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState([]);
  const [selectedConcierto, setSelectedConcierto] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [creatingReserva, setCreatingReserva] = useState(false);
  const [reservaResult, setReservaResult] = useState(null);
  const [misReservas, setMisReservas] = useState([]);
  const [recepcionConciertoId, setRecepcionConciertoId] = useState("");
  const [scannerToken, setScannerToken] = useState("");
  const [manualReservaCode, setManualReservaCode] = useState("");
  const [pendingWarning, setPendingWarning] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrPreviewLoading, setQrPreviewLoading] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [cancelReservaTarget, setCancelReservaTarget] = useState(null);
  const [cancelingReserva, setCancelingReserva] = useState(false);
  const [conciertosConReservaActiva, setConciertosConReservaActiva] = useState([]);
  const [downloadingPdfReservaId, setDownloadingPdfReservaId] = useState(null);
  const [decodingQrPhoto, setDecodingQrPhoto] = useState(false);
  const qrPhotoInputRef = useRef(null);
  const [adminData, setAdminData] = useState({ programas: [], conciertos: [], usuarios: [] });
  const [eventosConcierto, setEventosConcierto] = useState([]);
  const [adminConciertoStatsById, setAdminConciertoStatsById] = useState({});
  const [adminConciertoStatsLoadingById, setAdminConciertoStatsLoadingById] = useState({});
  const [adminTab, setAdminTab] = useState("programas");
  const [programaForm, setProgramaForm] = useState({ nombre: "", detalle_richtext: "", activo: true });
  const [conciertoForm, setConciertoForm] = useState({
    id: null,
    ofrn_evento_id: "",
    nombre: "",
    detalle_richtext: "",
    imagen_drive_url: "",
    capacidad_maxima: 100,
    reservas_habilitadas: true,
    activo: true,
  });

  const canAdmin = profile?.rol === "admin";
  const canRecepcion = profile?.rol === "recepcionista" || profile?.rol === "admin";
  const section = searchParams.get("view") || "catalogo";
  const conciertoSlug = searchParams.get("concierto") || "";

  const loadBase = async () => {
    setLoading(true);
    try {
      const [data, idsReservados] = await Promise.all([
        listProgramasConConciertos(),
        listConciertoIdsConReservaActiva(),
      ]);
      setConciertosConReservaActiva(idsReservados);
      setProgramas(data);
      if (conciertoSlug) {
        const concierto = await getConciertoBySlug(conciertoSlug);
        setSelectedConcierto(concierto);
      } else {
        setSelectedConcierto(null);
      }
      if (section === "mis-reservas") {
        const reservas = await listarMisReservas();
        setMisReservas(reservas);
      }
      if (canAdmin && section === "admin") {
        setAdminData(await listAdminData());
        const { data: eventosData, error: eventosError } = await supabase
          .from("eventos")
          .select(
            "id, id_gira, fecha, hora_inicio, descripcion, tipos_evento(nombre), locaciones(nombre, localidades(localidad)), programas!eventos_id_gira_fkey(id, nombre_gira, nomenclador, mes_letra, subtitulo)",
          )
          .eq("is_deleted", false)
          .is("deleted_at", null)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true });
        if (eventosError) throw eventosError;
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);
        const onlyConciertos = (eventosData || []).filter((ev) =>
          String(ev?.tipos_evento?.nombre || "").toLowerCase().includes("concierto")
          && ev?.fecha
          && new Date(`${ev.fecha}T00:00:00`) >= inicioHoy,
        );
        setEventosConcierto(onlyConciertos);
      }
    } catch (error) {
      toast.error(error?.message || "No se pudo cargar Entradas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, conciertoSlug]);

  const concertosFlat = useMemo(
    () =>
      programas.flatMap((programa) =>
        (programa.entrada_concierto || []).map((concierto) => ({
          ...concierto,
          programa,
        })),
      ),
    [programas],
  );

  const inicioDiaHoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const conciertosRecepcion = useMemo(() => {
    return concertosFlat
      .filter((c) => c.activo && c.fecha_hora && new Date(c.fecha_hora) >= inicioDiaHoy)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
  }, [concertosFlat, inicioDiaHoy]);

  useEffect(() => {
    if (section !== "recepcion" || !canRecepcion) {
      return;
    }
    if (!recepcionConciertoId) {
      setQrPreview(null);
      setQrPreviewLoading(false);
      return;
    }
    const t = scannerToken.trim();
    const esCodigoManual = isManualReservaCodeInput(t);
    if (!esCodigoManual && t.length < 18) {
      setQrPreview(null);
      setQrPreviewLoading(false);
      return;
    }
    let active = true;
    setQrPreviewLoading(true);
    const timer = setTimeout(() => {
      previewEntradaQr(t, recepcionConciertoId)
        .then((p) => {
          if (active) setQrPreview(p);
        })
        .catch((err) => {
          if (active) {
            setQrPreview({
              ok: false,
              reason: "error",
              detalle: err?.message || String(err),
            });
          }
        })
        .finally(() => {
          if (active) setQrPreviewLoading(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      setQrPreviewLoading(false);
    };
  }, [scannerToken, section, canRecepcion, recepcionConciertoId]);

  const tieneReservaEnConcierto = (conciertoId) =>
    conciertosConReservaActiva.includes(Number(conciertoId));

  const handlePickConcierto = (slug) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "catalogo");
    params.set("concierto", slug);
    setSearchParams(params);
  };

  const handleCreateReserva = async () => {
    if (!selectedConcierto?.id) return;
    setCreatingReserva(true);
    try {
      const result = await crearReserva({ conciertoId: selectedConcierto.id, cantidad });
      const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
      const entriesQr = await Promise.all((result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)));
      setReservaResult({ ...result, reservaQr, entriesQr, cantidad_solicitada: cantidad });
      let pdfBase64;
      try {
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto: selectedConcierto,
          reserva: { codigo_reserva: result.codigo_reserva, cantidad_solicitada: cantidad },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        pdfBase64 = await blobToPdfBase64ForMail(blob);
      } catch (pdfErr) {
        console.error(pdfErr);
        toast.message("Reserva creada. No se pudo generar el PDF; podés intentar desde «Mis reservas» luego.");
      }
      try {
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
        });
        if (pdfBase64) {
          toast.success("Reserva confirmada: se descargó el PDF y el mail se envió con el mismo adjunto.");
        } else {
          toast.success("Reserva confirmada y mail enviado. El PDF no se generó; probá descargar desde «Mis reservas».");
        }
      } catch {
        toast.message(
          pdfBase64
            ? "Reserva creada y PDF generado, pero el mail no pudo enviarse."
            : "Reserva creada. El mail no pudo enviarse automáticamente.",
        );
      }
      await loadBase();
    } catch (error) {
      toast.error(error?.message || "No se pudo crear la reserva.");
    } finally {
      setCreatingReserva(false);
    }
  };

  const consumeToken = async ({ forceParcial = false } = {}) => {
    if (!scannerToken.trim() || !recepcionConciertoId) {
      if (!recepcionConciertoId) toast.error("Elegí un concierto en la lista para registrar ingresos.");
      return;
    }
    setIngresando(true);
    try {
      const result = await validarYConsumirQr({
        token: scannerToken,
        modo: "auto",
        confirmarParcial: forceParcial,
        conciertoId: recepcionConciertoId,
      });
      if (result?.warning || result?.reason === "reserva_uso_parcial") {
        setPendingWarning(result);
        return;
      }
      if (!result?.ok) {
        toast.error(formatEntradasValidacionError(result));
        return;
      }
      toast.success(formatEntradasValidacionSuccess(result));
      setScannerToken("");
      setManualReservaCode("");
      setQrPreview(null);
    } finally {
      setIngresando(false);
    }
  };

  const handleNativeQrPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!recepcionConciertoId) {
      toast.error("Elegí primero el concierto de este turno.");
      return;
    }
    setDecodingQrPhoto(true);
    try {
      const text = await decodeQrFromImageFile(file);
      if (text?.trim()) {
        setScannerToken(text.trim());
        toast.success("Código leído de la imagen.");
      } else {
        toast.error("No se leyó el QR. Probá otra toma o pegá el token abajo.");
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo leer la imagen.");
    } finally {
      setDecodingQrPhoto(false);
    }
  };

  const submitPrograma = async (event) => {
    event.preventDefault();
    await adminUpsertPrograma(programaForm);
    toast.success("Programa guardado.");
    setProgramaForm({ nombre: "", detalle_richtext: "", activo: true });
    setAdminData(await listAdminData());
  };

  const handleConfirmCancelReserva = async () => {
    if (!cancelReservaTarget?.id) return;
    setCancelingReserva(true);
    try {
      await cancelarReserva(cancelReservaTarget.id);
      try {
        await enviarMailCancelacionReserva({ reservaId: cancelReservaTarget.id });
        toast.success("Reserva cancelada. Revisá tu correo para la confirmación.");
      } catch {
        toast.message("Reserva cancelada. No pudimos enviar el mail de confirmación.");
      }
      setCancelReservaTarget(null);
      await loadBase();
    } catch (err) {
      toast.error(err?.message || "No se pudo cancelar la reserva.");
    } finally {
      setCancelingReserva(false);
    }
  };

  const submitConcierto = async (event) => {
    event.preventDefault();
    await adminUpsertConcierto({
      ...conciertoForm,
      imagen_drive_url: normalizeDriveImageUrl(conciertoForm.imagen_drive_url),
    });
    toast.success(conciertoForm.id ? "Concierto actualizado." : "Concierto guardado.");
    setConciertoForm({
      id: null,
      ofrn_evento_id: "",
      nombre: "",
      detalle_richtext: "",
      imagen_drive_url: "",
      capacidad_maxima: 100,
      reservas_habilitadas: true,
      activo: true,
    });
    setAdminData(await listAdminData());
    setAdminConciertoStatsById({});
    setAdminConciertoStatsLoadingById({});
  };

  const cargarStatsConcierto = async (conciertoId) => {
    const id = Number(conciertoId);
    if (!id || adminConciertoStatsById[id]) return;
    setAdminConciertoStatsLoadingById((prev) => ({ ...prev, [id]: true }));
    try {
      const stats = await getAdminConciertoStats(id);
      setAdminConciertoStatsById((prev) => ({ ...prev, [id]: stats }));
    } catch (err) {
      toast.error(err?.message || "No se pudieron cargar estadísticas del concierto.");
    } finally {
      setAdminConciertoStatsLoadingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const startEditConcierto = (concierto) => {
    setConciertoForm({
      id: concierto.id,
      ofrn_evento_id: concierto.ofrn_evento_id ?? "",
      nombre: concierto.nombre || "",
      detalle_richtext: concierto.detalle_richtext || "",
      imagen_drive_url: concierto.imagen_drive_url || "",
      capacidad_maxima: Number(concierto.capacidad_maxima || 100),
      reservas_habilitadas: concierto.reservas_habilitadas ?? true,
      activo: concierto.activo ?? true,
    });
  };

  const resetConciertoForm = () => {
    setConciertoForm({
      id: null,
      ofrn_evento_id: "",
      nombre: "",
      detalle_richtext: "",
      imagen_drive_url: "",
      capacidad_maxima: 100,
      reservas_habilitadas: true,
      activo: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm uppercase tracking-wide font-semibold text-slate-500">Cargando entradas...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">Entradas OFRN</h1>
            <p className="text-xs text-slate-500">{profile.apellido}, {profile.nombre}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "catalogo" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "catalogo" })}>Catálogo</button>
          <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "mis-reservas" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "mis-reservas" })}>Mis reservas</button>
          {canRecepcion && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "recepcion" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "recepcion" })}>Recepción</button>}
          {canAdmin && <button className={`rounded-xl px-3 py-2 text-xs font-bold ${section === "admin" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`} onClick={() => setSearchParams({ view: "admin" })}>Admin</button>}
        </div>

        {section === "catalogo" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Programas y conciertos</h2>
              <div className="space-y-3">
                {programas.map((programa) => (
                  <article key={programa.id} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="font-bold text-slate-800">{programa.nombre}</h3>
                    <div className="mt-2 space-y-2">
                      {(programa.entrada_concierto || []).map((concierto) => (
                        <button
                          key={concierto.id}
                          type="button"
                          className="w-full text-left rounded-lg border border-slate-200 hover:border-indigo-300 px-3 py-2"
                          onClick={() => handlePickConcierto(concierto.slug_publico)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-700">{concierto.nombre}</p>
                            {tieneReservaEnConcierto(concierto.id) && (
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                Con reserva
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{formatDate(concierto.fecha_hora)}</p>
                          {concierto.lugar_nombre && <p className="text-xs text-slate-500">{concierto.lugar_nombre}</p>}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              {!selectedConcierto && <p className="text-sm text-slate-500">Seleccioná un concierto para ver su URL compartible y reservar.</p>}
              {selectedConcierto && (
                <>
                  <h3 className="text-lg font-bold text-slate-800">{selectedConcierto.nombre}</h3>
                  <p className="text-xs text-slate-500">{formatDate(selectedConcierto.fecha_hora)}</p>
                  {selectedConcierto.lugar_nombre && <p className="text-xs text-slate-500">{selectedConcierto.lugar_nombre}</p>}
                  {selectedConcierto.imagen_drive_url && (
                    <img
                      src={normalizeDriveImageUrl(selectedConcierto.imagen_drive_url)}
                      alt={selectedConcierto.nombre}
                      className="w-full h-44 rounded-xl object-cover border border-slate-200"
                      onError={(event) => {
                        const img = event.currentTarget;
                        const original = String(selectedConcierto.imagen_drive_url || "");
                        const fallbackMatch =
                          original.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
                          || original.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
                        const fallbackId = fallbackMatch?.[1];
                        if (!fallbackId) return;
                        const currentSrc = img.getAttribute("src") || "";
                        if (currentSrc.includes("/thumbnail?")) {
                          img.src = `https://drive.google.com/uc?export=view&id=${fallbackId}`;
                        }
                      }}
                    />
                  )}
                  <div
                    className="entradas-richtext text-sm text-slate-700"
                    dangerouslySetInnerHTML={{ __html: selectedConcierto.detalle_richtext || "" }}
                  />
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                    Disponibles: <strong>{computeDisponibles(selectedConcierto)}</strong> / {selectedConcierto.capacidad_maxima}
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs break-all">
                    URL: {window.location.origin}/entradas?view=catalogo&concierto={selectedConcierto.slug_publico}
                  </div>
                  {tieneReservaEnConcierto(selectedConcierto.id) && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Ya tenés una reserva activa para este concierto. Podés verla en &quot;Mis reservas&quot;.
                    </p>
                  )}
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cantidad</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                    value={cantidad}
                    onChange={(event) => setCantidad(Number(event.target.value))}
                    disabled={tieneReservaEnConcierto(selectedConcierto.id)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n} entrada{n > 1 ? "s" : ""}</option>))}
                  </select>
                  <button
                    onClick={handleCreateReserva}
                    disabled={
                      creatingReserva
                      || !selectedConcierto.reservas_habilitadas
                      || computeDisponibles(selectedConcierto) < cantidad
                      || tieneReservaEnConcierto(selectedConcierto.id)
                    }
                    className="w-full rounded-lg bg-blue-700 text-white py-2 text-sm font-semibold disabled:bg-slate-300"
                  >
                    {creatingReserva ? "Reservando..." : "Reservar"}
                  </button>
                  {reservaResult && (
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <p className="text-sm font-bold text-emerald-700">Reserva #{reservaResult.codigo_reserva}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedConcierto) return;
                          try {
                            const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
                              concierto: selectedConcierto,
                              reserva: {
                                codigo_reserva: reservaResult.codigo_reserva,
                                cantidad_solicitada: reservaResult.cantidad_solicitada ?? cantidad,
                              },
                              reservaQrDataUrl: reservaResult.reservaQr,
                              entriesQrDataUrls: reservaResult.entriesQr,
                            });
                            downloadEntradasReservaPdfBlob(blob, filename);
                          } catch (e) {
                            toast.error(e?.message || "No se pudo generar el PDF.");
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-800"
                      >
                        Descargar PDF (detalle y QRs)
                      </button>
                      <img src={reservaResult.reservaQr} alt="QR reserva general" className="w-40 h-40 border border-slate-200 rounded-lg" />
                      <div className="grid grid-cols-2 gap-2">
                        {reservaResult.entriesQr.map((qr, idx) => (
                          <img key={idx} src={qr} alt={`QR entrada ${idx + 1}`} className="w-full border border-slate-200 rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {section === "mis-reservas" && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Mis reservas</h2>
            <div className="space-y-2">
              {misReservas.map((reserva) => {
                const ingresadas = (reserva.entradas || []).filter((x) => x.estado_ingreso === "ingresada").length;
                const esActiva = reserva.estado === "activa";
                return (
                  <article key={reserva.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{reserva.concierto?.nombre} · {reserva.codigo_reserva}</p>
                        <p className="text-xs text-slate-500">{formatDate(reserva.concierto?.fecha_hora)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          esActiva ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {esActiva ? "Activa" : "Cancelada"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Entradas: {reserva.cantidad_solicitada} · Ingresadas: {ingresadas}
                    </p>
                    {esActiva && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={downloadingPdfReservaId === reserva.id}
                          onClick={async () => {
                            setDownloadingPdfReservaId(reserva.id);
                            try {
                              await descargarPdfDesdeReservaRow(reserva);
                            } catch (e) {
                              toast.error(e?.message || "No se pudo generar el PDF.");
                            } finally {
                              setDownloadingPdfReservaId(null);
                            }
                          }}
                          className="w-full sm:w-auto rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {downloadingPdfReservaId === reserva.id ? "Generando PDF…" : "Descargar PDF (detalle y QRs)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelReservaTarget(reserva)}
                          className="w-full sm:w-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                        >
                          Cancelar reserva
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
              {misReservas.length === 0 && <p className="text-sm text-slate-500">Aún no tenés reservas.</p>}
            </div>
          </section>
        )}

        {section === "recepcion" && canRecepcion && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Recepción</h2>
            <input
              ref={qrPhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleNativeQrPhoto}
            />
            <div className="flex w-full items-stretch gap-2 min-w-0">
              <select
                className="min-w-0 rounded-lg border border-slate-300 px-2 py-2.5 text-sm font-medium text-slate-800 w-[80%] max-w-[80%] shrink-0"
                value={recepcionConciertoId}
                onChange={(e) => {
                  setRecepcionConciertoId(e.target.value);
                  setScannerToken("");
                  setQrPreview(null);
                }}
              >
                <option value="">Concierto (desde hoy)…</option>
                {conciertosRecepcion.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {formatDate(c.fecha_hora)} — {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Escanear QR (cámara)"
                onClick={() => qrPhotoInputRef.current?.click()}
                disabled={decodingQrPhoto || !recepcionConciertoId}
                className="flex w-[20%] min-w-0 max-w-[20%] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 disabled:opacity-40"
              >
                {decodingQrPhoto ? <span className="text-[10px] font-bold">…</span> : <IconCamera size={26} className="shrink-0" />}
              </button>
            </div>
            <input
              value={scannerToken}
              onChange={(event) => setScannerToken(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Pegá el token QR completo (ENTR-...) o usá código manual abajo"
            />
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                value={manualReservaCode}
                onChange={(event) => {
                  const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 10);
                  setManualReservaCode(onlyDigits);
                  if (onlyDigits.length === 10) {
                    setScannerToken(onlyDigits);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tracking-[0.18em]"
                placeholder="Código manual (10 dígitos)"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualReservaCode.length === 10) {
                    setScannerToken(manualReservaCode);
                  }
                }}
                disabled={manualReservaCode.length !== 10}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"
              >
                Usar código
              </button>
            </div>
            {qrPreviewLoading && <p className="text-sm text-indigo-600 font-medium">Analizando código…</p>}
            {qrPreview && !qrPreview.ok && (
              <div
                className={`rounded-xl border-2 p-3 text-sm text-slate-800 shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="font-medium">{formatEntradasPreviewError(qrPreview)}</p>
              </div>
            )}
            {qrPreview && qrPreview.ok && qrPreview.tipo === "entrada" && (
              <div
                className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Entrada individual</p>
                <p className="text-slate-800">
                  Reserva <span className="font-mono font-semibold">{qrPreview.codigo_reserva || "—"}</span> · Entrada nº {qrPreview.entrada_orden} de {qrPreview.cantidad_en_reserva}
                </p>
                <p className="font-medium text-slate-800">
                  {qrPreview.estado_ingreso === "pendiente" ? (
                    <span>Sin ingreso registrado aún con esta plaza.</span>
                  ) : (
                    <span>Ingreso: {formatDate(qrPreview.ingresada_at) || "—"}</span>
                  )}
                </p>
                {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2 mt-1">{entradasBloqueoIngreso(qrPreview)}</p>
                )}
              </div>
            )}
            {qrPreview && qrPreview.ok && qrPreview.tipo === "reserva" && (
              <div
                className={`rounded-xl border-2 p-4 space-y-2 text-sm shadow-sm ${recepcionPanelClass(qrPreview)}`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Reserva (grupo)</p>
                <p>
                  Código <span className="font-mono font-semibold">{qrPreview.codigo_reserva}</span> · {qrPreview.cantidad_solicitada} plaza
                  {Number(qrPreview.cantidad_solicitada) !== 1 ? "s" : ""}
                </p>
                <p>
                  {qrPreview.pendientes} sin ingresar · {qrPreview.ingresadas} ya ingresaron
                </p>
                {qrPreview.necesita_confirmar_parcial && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2">
                    Ingreso parcial: al confirmar se completarán las plazas pendientes (se pedirá confirmación).
                  </p>
                )}
                {Array.isArray(qrPreview.entradas) && qrPreview.entradas.length > 0 && (
                  <ul className="text-xs space-y-1.5 border-t border-slate-300/50 pt-2">
                    {qrPreview.entradas.map((row) => (
                      <li key={row.orden} className="flex flex-wrap gap-2 justify-between text-slate-800">
                        <span>Plaza nº {row.orden}</span>
                        {row.estado_ingreso === "pendiente" ? (
                          <span className="font-medium">Pendiente</span>
                        ) : (
                          <span>Ingresó {row.ingresada_at ? formatDate(row.ingresada_at) : ""}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {!qrPreview.puede_ingresar && entradasBloqueoIngreso(qrPreview) && (
                  <p className="text-xs text-slate-800 border-t border-slate-300/50 pt-2">{entradasBloqueoIngreso(qrPreview)}</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => consumeToken()}
              className="w-full rounded-lg bg-emerald-600 text-white py-3 text-sm font-bold disabled:bg-slate-300"
              disabled={
                !recepcionConciertoId
                || !scannerToken.trim()
                || qrPreviewLoading
                || !qrPreview
                || !qrPreview.ok
                || !qrPreview.puede_ingresar
                || ingresando
              }
            >
              {ingresando ? "Registrando…" : "Ingresar a sala"}
            </button>
          </section>
        )}

        {section === "admin" && canAdmin && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex gap-2">
              {ADMIN_TABS.map((tab) => (
                <button key={tab} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase ${adminTab === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setAdminTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {adminTab === "programas" && (
              <form className="space-y-3" onSubmit={submitPrograma}>
                <input value={programaForm.nombre} onChange={(event) => setProgramaForm((prev) => ({ ...prev, nombre: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del programa" required />
                <RichTextEditor value={programaForm.detalle_richtext} onChange={(value) => setProgramaForm((prev) => ({ ...prev, detalle_richtext: value }))} placeholder="Detalle del programa (texto enriquecido)" />
                <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">Guardar programa</button>
                <div className="space-y-2">
                  {adminData.programas.map((programa) => <div key={programa.id} className="rounded-lg border border-slate-200 p-2 text-sm">{programa.nombre}</div>)}
                </div>
              </form>
            )}

            {adminTab === "conciertos" && (
              <form className="space-y-3" onSubmit={submitConcierto}>
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">
                  {conciertoForm.id ? "Editar concierto" : "Nuevo concierto"}
                </h3>
                <select value={conciertoForm.ofrn_evento_id} onChange={(event) => setConciertoForm((prev) => ({ ...prev, ofrn_evento_id: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Seleccionar evento OFRN (tipo concierto)</option>
                  {eventosConcierto.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {`${buildProgramaLabel(ev.programas)} · ${formatDateLongEs(`${ev.fecha}T00:00:00`)}`}
                    </option>
                  ))}
                </select>
                <input value={conciertoForm.nombre} onChange={(event) => setConciertoForm((prev) => ({ ...prev, nombre: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Nombre del concierto" required />
                <p className="text-xs text-slate-500">Fecha, hora y lugar se toman del evento OFRN seleccionado.</p>
                <input value={conciertoForm.imagen_drive_url} onChange={(event) => setConciertoForm((prev) => ({ ...prev, imagen_drive_url: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="URL pública de portada (Google Drive)" />
                <input type="number" min={1} value={conciertoForm.capacidad_maxima} onChange={(event) => setConciertoForm((prev) => ({ ...prev, capacidad_maxima: Number(event.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Capacidad máxima" required />
                <RichTextEditor value={conciertoForm.detalle_richtext} onChange={(value) => setConciertoForm((prev) => ({ ...prev, detalle_richtext: value }))} placeholder="Detalle del concierto" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-semibold">
                    {conciertoForm.id ? "Actualizar concierto" : "Guardar concierto"}
                  </button>
                  {conciertoForm.id && (
                    <button
                      type="button"
                      onClick={resetConciertoForm}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {adminData.conciertos.map((concierto) => {
                    const stats = adminConciertoStatsById[concierto.id];
                    const loadingStats = Boolean(adminConciertoStatsLoadingById[concierto.id]);
                    return (
                      <div key={concierto.id} className="rounded-lg border border-slate-200 p-3 text-sm space-y-2">
                        <p className="font-semibold text-slate-800">
                          {concierto.nombre} · {formatDate(concierto.fecha_hora)}
                          {concierto.lugar_nombre ? ` · ${concierto.lugar_nombre}` : ""}
                        </p>
                        {concierto.detalle_richtext && (
                          <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Vista previa del detalle
                            </p>
                            <div
                              className="entradas-richtext text-xs text-slate-700"
                              dangerouslySetInnerHTML={{ __html: concierto.detalle_richtext }}
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditConcierto(concierto)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
                          >
                            Editar
                          </button>
                          {!stats && (
                            <button
                              type="button"
                              onClick={() => cargarStatsConcierto(concierto.id)}
                              disabled={loadingStats}
                              className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 disabled:opacity-60"
                            >
                              {loadingStats ? "Cargando estadísticas..." : "Ver estadísticas"}
                            </button>
                          )}
                        </div>
                        {stats && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5">
                                <span className="font-bold text-indigo-800">Reservadas:</span>{" "}
                                <span className="text-indigo-900">{stats.reservadas}</span>
                              </div>
                              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                                <span className="font-bold text-emerald-800">Disponibles:</span>{" "}
                                <span className="text-emerald-900">{stats.disponibles}</span>
                              </div>
                              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
                                <span className="font-bold text-amber-800">Ingresadas:</span>{" "}
                                <span className="text-amber-900">{stats.ingresadas}</span>
                              </div>
                              <div className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1.5 text-slate-700">
                                <span className="font-bold">Reservadas no utilizadas:</span> {stats.noUtilizadas}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Capacidad máxima: {stats.capacidad}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </form>
            )}

            {adminTab === "usuarios" && (
              <div className="space-y-2">
                {adminData.usuarios.map((usr) => (
                  <div key={usr.id} className="rounded-lg border border-slate-200 p-2 flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{usr.apellido}, {usr.nombre}</p>
                    <select
                      value={usr.rol}
                      onChange={async (event) => {
                        await adminUpdateUsuarioRol({ id: usr.id, rol: event.target.value });
                        setAdminData(await listAdminData());
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="personal">personal</option>
                      <option value="recepcionista">recepcionista</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <ConfirmModal
        isOpen={Boolean(pendingWarning)}
        onClose={() => setPendingWarning(null)}
        title="La reserva ya tuvo ingresos parciales"
        message={`Reserva ${pendingWarning?.codigo_reserva || "—"}: ya se registraron ${pendingWarning?.ingresadas || 0} entrada(s). ¿Querés completar ahora el ingreso de las ${pendingWarning?.pendientes || 0} que siguen pendientes?`}
        confirmText="Consumir pendientes"
        onConfirm={async () => {
          await consumeToken({ forceParcial: true });
          setPendingWarning(null);
        }}
      />

      <ConfirmModal
        isOpen={Boolean(cancelReservaTarget)}
        onClose={() => !cancelingReserva && setCancelReservaTarget(null)}
        title="Cancelar reserva"
        message={
          cancelReservaTarget
            ? `¿Seguro que querés cancelar la reserva ${cancelReservaTarget.codigo_reserva}?\n\nLos códigos QR dejarán de valer y las plazas se liberarán para otras personas.${
                (cancelReservaTarget.entradas || []).some((e) => e.estado_ingreso === "ingresada")
                  ? "\n\nNota: si ya ingresó alguien con una entrada, esa asistencia no se borra; solo se anulan las entradas pendientes."
                  : ""
              }`
            : ""
        }
        confirmText={cancelingReserva ? "Cancelando…" : "Sí, cancelar reserva"}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md"
        onConfirm={handleConfirmCancelReserva}
      />
    </div>
  );
}
