import { toast } from "sonner";
import { markEncargoArregloMailSent } from "./encargoArregloMail";
import { seedArregloReferenciaObraOrigen } from "./arreglosReferencias";
import { syncObraArregladorFromIntegrante } from "./syncObraArreglador";

export function formatSolicitanteNombre(user) {
  if (!user) return "Sistema";
  const label = `${user.apellido || ""}, ${user.nombre || ""}`.trim();
  return label || "Sistema";
}

function findIntegranteArreglador(integrantesArregladorOptions, idIntegranteArregladorVal) {
  return integrantesArregladorOptions.find(
    (i) => Number(i.id) === Number(idIntegranteArregladorVal),
  );
}

export async function sendEncargoArregloMail({
  supabase,
  user,
  integrantesArregladorOptions,
  obraId,
  titulo,
  idIntegranteArreglador,
  linkDrive = null,
  observaciones = null,
  fechaEsperada = null,
  dificultad = null,
  instrumentacion = null,
  solicitadoPor = null,
  logContext = "encargo_arreglo",
}) {
  const integranteOpt = findIntegranteArreglador(
    integrantesArregladorOptions,
    idIntegranteArreglador,
  );
  const arregladorLabel = integranteOpt?.label || "";
  const emailTo = integranteOpt?.mail || null;
  if (!emailTo) {
    console.warn(`${logContext}: sin email para integrante`, idIntegranteArreglador);
    toast.error("No se encontró email del arreglador para enviar el encargo.");
    return false;
  }

  const { error } = await supabase.functions.invoke("mails_produccion", {
    body: {
      action: "enviar_mail",
      templateId: "encargo_arreglo",
      email: emailTo,
      bcc: ["ofrn.archivo@gmail.com"],
      nombre: formatSolicitanteNombre(user),
      gira: null,
      detalle: {
        titulo,
        arreglador: arregladorLabel,
        id_obra: obraId,
        link_drive: linkDrive || null,
        observaciones: observaciones || null,
        fecha_esperada: fechaEsperada || null,
        dificultad: dificultad || null,
        instrumentacion: instrumentacion || null,
        solicitado_por: solicitadoPor || null,
      },
    },
  });
  if (error) {
    console.error(`mails_produccion (${logContext}):`, error);
    toast.error("No se pudo enviar el mail de encargo.");
    return false;
  }
  toast.success("Mail de encargo enviado al Arreglador y al Archivista.");
  return true;
}

export async function sendEncargoAjusteMail({
  supabase,
  user,
  integrantesArregladorOptions,
  idAjuste,
  idObra,
  tituloStr,
  idIntegranteArreglador,
  linkDrive = null,
  brief = null,
  tipo = "cambio_menor",
  partesAfectadas = null,
  fechaEsperada = null,
  solicitadoPor = null,
}) {
  const integranteOpt = findIntegranteArreglador(
    integrantesArregladorOptions,
    idIntegranteArreglador,
  );
  const emailTo = integranteOpt?.mail || null;
  if (!emailTo) {
    toast.error("No se encontró email del arreglador para el ajuste.");
    return false;
  }

  const { error } = await supabase.functions.invoke("mails_produccion", {
    body: {
      action: "enviar_mail",
      templateId: "encargo_ajuste",
      email: emailTo,
      bcc: ["ofrn.archivo@gmail.com"],
      nombre: formatSolicitanteNombre(user),
      gira: null,
      detalle: {
        titulo: tituloStr,
        arreglador: integranteOpt?.label || "",
        id_obra: idObra,
        id_ajuste: idAjuste,
        link_drive: linkDrive || null,
        brief: brief || null,
        tipo: tipo || "cambio_menor",
        partes_afectadas: partesAfectadas || null,
        fecha_esperada: fechaEsperada || null,
        solicitado_por: solicitadoPor || null,
      },
    },
  });
  if (error) {
    console.error("mails_produccion (encargo_ajuste):", error);
    toast.error("Ajuste creado, pero no se pudo enviar el mail.");
    return false;
  }
  toast.success("Mail de ajuste enviado al arreglador (BCC Archivo).");
  return true;
}

/** Crea obra «Para arreglar», vincula compositor/arreglador y opcionalmente referencia origen + mail. */
export async function createEncargoArregloObra({
  supabase,
  user,
  integrantesArregladorOptions,
  compositorId,
  arregladorId,
  titulo,
  instrumentacion = null,
  dificultad = null,
  observaciones = null,
  fechaEsperada = null,
  sourceObraId = null,
  sourceObraTitulo = null,
  sendMail = true,
  solicitadoPor = null,
  linkDrive = null,
}) {
  const payload = {
    titulo: (titulo || "").trim(),
    instrumentacion: (instrumentacion || "").trim() || null,
    dificultad: (dificultad || "").trim() || null,
    observaciones: (observaciones || "").trim() || null,
    estado: "Para arreglar",
    fecha_esperada: fechaEsperada || null,
    id_integrante_arreglador: arregladorId,
    id_usuario_carga: user?.id || null,
  };

  const { data, error } = await supabase.from("obras").insert([payload]).select("id").single();
  if (error) throw error;

  const obraId = data?.id;
  if (!obraId) throw new Error("No se obtuvo id de la obra creada.");

  const { error: relError } = await supabase.from("obras_compositores").insert([
    {
      id_obra: obraId,
      id_compositor: Number(compositorId),
      rol: "compositor",
    },
  ]);
  if (relError) throw relError;

  await syncObraArregladorFromIntegrante(supabase, obraId, arregladorId);

  if (sourceObraId) {
    await seedArregloReferenciaObraOrigen(
      supabase,
      obraId,
      sourceObraId,
      sourceObraTitulo,
    );
  }

  let mailSent = false;
  if (sendMail) {
    mailSent = await sendEncargoArregloMail({
      supabase,
      user,
      integrantesArregladorOptions,
      obraId,
      titulo: payload.titulo,
      idIntegranteArreglador: arregladorId,
      linkDrive,
      observaciones: payload.observaciones,
      fechaEsperada: payload.fecha_esperada,
      dificultad: payload.dificultad,
      instrumentacion: payload.instrumentacion,
      solicitadoPor: solicitadoPor ?? formatSolicitanteNombre(user),
    });
    if (mailSent) {
      await markEncargoArregloMailSent(supabase, obraId);
    }
  }

  return { obraId, mailSent };
}

/** Inserta ticket en obras_ajustes y notifica al arreglador. */
export async function createObraAjusteSolicitud({
  supabase,
  user,
  integrantesArregladorOptions,
  idObra,
  idIntegranteArreglador,
  tipo = "cambio_menor",
  brief = null,
  partesAfectadas = null,
  fechaEsperada = null,
  obraTitulo,
  linkDrive = null,
  solicitadoPor = null,
}) {
  const { data, error } = await supabase
    .from("obras_ajustes")
    .insert([
      {
        id_obra: Number(idObra),
        tipo: tipo || "cambio_menor",
        estado: "pendiente",
        origen: "solicitud_interna",
        id_integrante_arreglador: Number(idIntegranteArreglador),
        id_usuario_solicita: user?.id || null,
        fecha_esperada: fechaEsperada || null,
        brief: brief || null,
        partes_afectadas: partesAfectadas || null,
      },
    ])
    .select("id")
    .single();
  if (error) throw error;

  await sendEncargoAjusteMail({
    supabase,
    user,
    integrantesArregladorOptions,
    idAjuste: data.id,
    idObra: Number(idObra),
    tituloStr: obraTitulo,
    idIntegranteArreglador,
    linkDrive,
    brief,
    tipo,
    partesAfectadas,
    fechaEsperada,
    solicitadoPor: solicitadoPor ?? formatSolicitanteNombre(user),
  });

  return { ajusteId: data.id };
}
